import { type ChildProcess, execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { basename } from 'node:path'

export interface ServerConfig {
  bin: string
  model: string
  vad: string
}

interface ServerOptions {
  pidfile: string
  onRunningChange?: (running: boolean) => void
  /** Max time to wait for /health (first launch compiles Metal shaders) */
  readyTimeoutMs?: number
}

interface InferenceFields {
  language: string
  prompt: string
}

const STDERR_TAIL_BYTES = 4096

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      srv.close(() => {
        if (address && typeof address === 'object') resolve(address.port)
        else reject(new Error('Could not allocate a port for whisper-server'))
      })
    })
  })
}

function sameConfig(a: ServerConfig | null, b: ServerConfig) {
  return !!a && a.bin === b.bin && a.model === b.model && a.vad === b.vad
}

function isConnectionError(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string }
  const code = e?.code ?? e?.cause?.code
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') {
    return true
  }
  return typeof e?.message === 'string' && /fetch failed|socket/i.test(e.message)
}

/**
 * Owns a single whisper-server child process. The model lives in that
 * process's memory, so stopping the process is how memory is released.
 * Listens on a random localhost port behind a random request path, so other
 * local apps can't guess the endpoint.
 */
export class WhisperServer {
  private proc: ChildProcess | null = null
  private config: ServerConfig | null = null
  private baseUrl = ''
  private starting: Promise<string> | null = null
  private idleTimer: NodeJS.Timeout | null = null
  private inFlight = 0
  private stderrTail = ''

  constructor(private readonly opts: ServerOptions) {}

  get running(): boolean {
    return this.proc !== null
  }

  /** Starts the server (or reuses it) and resolves with its base URL. */
  ensure(config: ServerConfig): Promise<string> {
    if (this.starting && sameConfig(this.config, config)) return this.starting
    if (this.proc && sameConfig(this.config, config)) {
      return Promise.resolve(this.baseUrl)
    }

    // Registered synchronously so concurrent callers share one startup
    const previous = this.starting
    this.config = config
    const starting = (async () => {
      await previous?.catch(() => {})
      await this.stop()
      return this.start(config)
    })()
    this.starting = starting
    starting
      .finally(() => {
        if (this.starting === starting) this.starting = null
      })
      .catch(() => {})
    return starting
  }

  async transcribe(
    config: ServerConfig,
    wav: Uint8Array,
    fields: InferenceFields,
  ): Promise<string> {
    this.clearIdleTimer()
    this.inFlight++
    try {
      try {
        return await this.request(await this.ensure(config), wav, fields)
      } catch (err) {
        // A crashed or killed server: restart once and retry
        if (!isConnectionError(err)) throw err
        await this.stop()
        return await this.request(await this.ensure(config), wav, fields)
      }
    } finally {
      this.inFlight--
    }
  }

  /** Stops the server after `ms` without requests (0 = now, null = never). */
  scheduleIdleStop(ms: number | null) {
    this.clearIdleTimer()
    if (ms === null || this.inFlight > 0) return
    if (ms === 0) {
      void this.stop()
      return
    }
    this.idleTimer = setTimeout(() => void this.stop(), ms)
    this.idleTimer.unref()
  }

  async stop(): Promise<void> {
    this.clearIdleTimer()
    const proc = this.proc
    if (!proc) return
    this.proc = null
    this.baseUrl = ''

    await new Promise<void>((resolve) => {
      if (proc.exitCode !== null || proc.signalCode !== null) return resolve()
      const force = setTimeout(() => proc.kill('SIGKILL'), 2000)
      proc.once('exit', () => {
        clearTimeout(force)
        resolve()
      })
      proc.kill('SIGTERM')
    })
  }

  /** Synchronous kill for app quit, where there is no time to await. */
  kill() {
    this.clearIdleTimer()
    this.proc?.kill('SIGKILL')
    this.proc = null
  }

  /** Kills a whisper-server left behind by a previous crashed app run. */
  async killOrphan(): Promise<void> {
    const pid = Number(await readFile(this.opts.pidfile, 'utf8').catch(() => ''))
    if (!pid) return
    const comm = await new Promise<string>((resolve) => {
      execFile('/bin/ps', ['-p', String(pid), '-o', 'comm='], (_err, out) =>
        resolve(out.trim()),
      )
    })
    if (basename(comm) === 'whisper-server') {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {}
    }
    await unlink(this.opts.pidfile).catch(() => {})
  }

  private clearIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = null
  }

  private async start(config: ServerConfig): Promise<string> {
    const port = await getFreePort()
    const base = `http://127.0.0.1:${port}/${randomUUID()}`
    this.stderrTail = ''

    const proc = spawn(
      config.bin,
      [
        '--model', config.model,
        '--host', '127.0.0.1',
        '--port', String(port),
        '--request-path', new URL(base).pathname,
        '--vad',
        '--vad-model', config.vad,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )

    // Drain stderr (whisper logs every request) so the pipe never fills up
    proc.stderr?.on('data', (chunk: Buffer) => {
      this.stderrTail = (this.stderrTail + chunk.toString()).slice(-STDERR_TAIL_BYTES)
    })

    const exited = new Promise<never>((_, reject) => {
      proc.once('error', reject)
      proc.once('exit', (code, signal) => {
        reject(
          new Error(
            `whisper-server exited during startup (${signal ?? `code ${code}`}): ${this.lastLogLine()}`,
          ),
        )
      })
    })
    exited.catch(() => {})

    proc.once('exit', () => {
      if (this.proc === proc) {
        this.proc = null
        this.baseUrl = ''
      }
      // Leave the pidfile alone if a newer server already replaced this one
      if (!this.proc) void unlink(this.opts.pidfile).catch(() => {})
      this.opts.onRunningChange?.(this.proc !== null)
    })

    this.proc = proc
    if (proc.pid) await writeFile(this.opts.pidfile, String(proc.pid)).catch(() => {})

    try {
      await Promise.race([this.waitUntilHealthy(base, proc), exited])
    } catch (err) {
      if (this.proc === proc) this.kill()
      throw err
    }

    this.baseUrl = base
    this.opts.onRunningChange?.(true)
    return base
  }

  private async waitUntilHealthy(base: string, proc: ChildProcess) {
    const deadline = Date.now() + (this.opts.readyTimeoutMs ?? 30_000)
    while (Date.now() < deadline) {
      if (this.proc !== proc) throw new Error('whisper-server was stopped during startup')
      try {
        const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) })
        if (res.ok) return
      } catch {}
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error('whisper-server did not become ready in time')
  }

  private async request(base: string, wav: Uint8Array, fields: InferenceFields) {
    const form = new FormData()
    form.append('file', new Blob([wav as Uint8Array<ArrayBuffer>], { type: 'audio/wav' }), 'audio.wav')
    form.append('language', fields.language)
    // Always sent so an empty prompt never inherits a server-side default
    form.append('prompt', fields.prompt)
    form.append('response_format', 'json')

    const res = await fetch(`${base}/inference`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(120_000),
    })
    const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string }

    // Older servers answer 200 with an error body, so check both
    if (!res.ok || body.error) {
      throw new Error(`Local Whisper error: ${body.error ?? `HTTP ${res.status}`}`)
    }
    return body.text ?? ''
  }

  private lastLogLine(): string {
    const lines = this.stderrTail.trim().split('\n')
    return lines[lines.length - 1] || 'no output'
  }
}
