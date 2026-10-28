import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { type ServerConfig, WhisperServer } from '../../src/main/services/whisper/server'

// Stand-in for whisper-server: same CLI flags, /health and /inference under
// --request-path, echoing which model and language it got.
const FAKE_SERVER = `#!/usr/bin/env node
const http = require('node:http')
const args = process.argv.slice(2)
const arg = (flag) => args[args.indexOf(flag) + 1]
if (arg('--model').includes('broken')) {
  console.error('error: failed to load model')
  process.exit(1)
}
setTimeout(() => {
  http.createServer((req, res) => {
    const base = arg('--request-path')
    if (req.url === base + '/health') return res.end('{"status":"ok"}')
    if (req.method === 'POST' && req.url === base + '/inference') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const lang = /name="language"\\r\\n\\r\\n(\\w+)/.exec(body)?.[1]
        const vad = args.includes('--vad') && args.includes(arg('--vad-model'))
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ text: ' ' + require('node:path').basename(arg('--model')) + ' ' + lang + ' vad=' + vad + '\\n' }))
      })
      return
    }
    res.writeHead(404).end()
  }).listen(Number(arg('--port')), '127.0.0.1')
}, 100)
`

let dir = ''
let config: ServerConfig
let server: WhisperServer

const wav = new Uint8Array(44)
const fields = { language: 'pt', prompt: 'Oi!' }

function serverPid(): number {
  return Number(readFileSync(join(dir, 'server.pid'), 'utf8'))
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'ptt-whisper-server-'))
  const bin = join(dir, 'whisper-server')
  writeFileSync(bin, FAKE_SERVER)
  chmodSync(bin, 0o755)
  config = { bin, model: join(dir, 'model-a.bin'), vad: join(dir, 'vad.bin') }
})

afterEach(async () => {
  await server?.stop()
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('WhisperServer', () => {
  it('starts on demand and transcribes', async () => {
    server = new WhisperServer({ pidfile: join(dir, 'server.pid') })
    expect(server.running).toBe(false)

    const text = await server.transcribe(config, wav, fields)

    expect(text).toBe(' model-a.bin pt vad=true\n')
    expect(server.running).toBe(true)
  })

  it('reuses the process for the same config and restarts for a new model', async () => {
    server = new WhisperServer({ pidfile: join(dir, 'server.pid') })
    await server.ensure(config)
    const first = serverPid()

    await server.ensure(config)
    expect(serverPid()).toBe(first)

    const text = await server.transcribe({ ...config, model: join(dir, 'model-b.bin') }, wav, fields)
    expect(text).toContain('model-b.bin')
    expect(serverPid()).not.toBe(first)
  })

  it('shares one startup between concurrent callers', async () => {
    server = new WhisperServer({ pidfile: join(dir, 'server.pid') })
    const [a, b] = await Promise.all([server.ensure(config), server.ensure(config)])
    expect(a).toBe(b)
  })

  it('restarts transparently after the process dies', async () => {
    server = new WhisperServer({ pidfile: join(dir, 'server.pid') })
    await server.ensure(config)
    process.kill(serverPid(), 'SIGKILL')

    const text = await server.transcribe(config, wav, fields)
    expect(text).toContain('model-a.bin')
  })

  it('stops after the idle timeout and frees the process', async () => {
    const changes: boolean[] = []
    server = new WhisperServer({
      pidfile: join(dir, 'server.pid'),
      onRunningChange: (running) => changes.push(running),
    })
    await server.ensure(config)
    const pid = serverPid()

    server.scheduleIdleStop(50)
    await new Promise((r) => setTimeout(r, 300))

    expect(server.running).toBe(false)
    expect(changes).toEqual([true, false])
    expect(() => process.kill(pid, 0)).toThrow()
    expect(existsSync(join(dir, 'server.pid'))).toBe(false)
  })

  it('never stops when the keep-alive is "always" (null)', async () => {
    server = new WhisperServer({ pidfile: join(dir, 'server.pid') })
    await server.ensure(config)
    server.scheduleIdleStop(null)
    await new Promise((r) => setTimeout(r, 100))
    expect(server.running).toBe(true)
  })

  it('reports why the server failed to start', async () => {
    server = new WhisperServer({ pidfile: join(dir, 'server.pid') })
    await expect(
      server.ensure({ ...config, model: join(dir, 'broken.bin') }),
    ).rejects.toThrow(/failed to load model/)
    expect(server.running).toBe(false)
  })
})
