/**
 * End-to-end tests against a real whisper-server and Whisper large-v3-turbo.
 *
 * Requires WHISPER_SERVER_BIN (built with scripts/build-whisper-server.sh)
 * and ffmpeg. Models are downloaded into WHISPER_MODEL_DIR (default
 * /tmp/ptt-whisper-models, ~575 MB) on the first run, which also exercises
 * the real Hugging Face download and checksum path. Skipped if the binary or
 * ffmpeg is missing.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { downloadFile } from '../../src/main/services/whisper/download'
import {
  buildWhisperPrompt,
  cleanWhisperText,
  whisperLanguage,
} from '../../src/main/services/whisper/prompt'
import { type ServerConfig, WhisperServer } from '../../src/main/services/whisper/server'
import { encodeWav } from '../../src/shared/wav'
import { WHISPER_MODELS, WHISPER_VAD_MODEL } from '../../src/shared/whisper'

const bin = process.env.WHISPER_SERVER_BIN ?? ''
const modelDir = process.env.WHISPER_MODEL_DIR ?? '/tmp/ptt-whisper-models'
const fixture = resolve(__dirname, '..', 'fixtures', 'audio', 'recording-pt-br.webm')

function hasFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const enabled = !!bin && existsSync(bin) && hasFfmpeg()

// Same path the renderer takes: decode to 16 kHz mono floats, then encodeWav
function fixtureWav(): Uint8Array {
  const pcm = execFileSync('ffmpeg', [
    '-v', 'error', '-i', fixture, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-',
  ], { maxBuffer: 64 * 1024 * 1024 })
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4)
  return encodeWav(samples, 16000)
}

const silence = encodeWav(new Float32Array(16000 * 2), 16000)

describe.skipIf(!enabled)('whisper-server E2E', () => {
  const model = WHISPER_MODELS['large-v3-turbo-q5_0']
  let dir = ''
  let config: ServerConfig
  let server: WhisperServer

  const transcribe = async (wav: Uint8Array, locale = 'pt-BR') =>
    cleanWhisperText(
      await server.transcribe(config, wav, {
        language: whisperLanguage(locale),
        prompt: buildWhisperPrompt(locale, ''),
      }),
    )

  beforeAll(async () => {
    for (const file of [model, WHISPER_VAD_MODEL]) {
      const dest = join(modelDir, file.file)
      if (!existsSync(dest)) {
        await downloadFile({ url: file.url, dest, sha256: file.sha256, size: file.size, fetch })
      }
    }
    dir = mkdtempSync(join(tmpdir(), 'ptt-whisper-e2e-'))
    config = {
      bin,
      model: join(modelDir, model.file),
      vad: join(modelDir, WHISPER_VAD_MODEL.file),
    }
    server = new WhisperServer({ pidfile: join(dir, 'server.pid'), readyTimeoutMs: 60_000 })
  }, 600_000)

  afterAll(async () => {
    await server?.stop()
    rmSync(dir, { recursive: true, force: true })
  })

  it('transcribes pt-BR with numerals as digits', async () => {
    const started = Date.now()
    const out = await transcribe(fixtureWav())
    console.error(`[whisper pt-BR, cold start ${Date.now() - started} ms] ${out}`)

    expect(out).toMatch(/\b5\b/)
    expect(out).toMatch(/\b72\b/)
    expect(out).toMatch(/maçãs/i)
    expect(out).toMatch(/bairro/i)
    expect(out).not.toMatch(/\n/)
  })

  it('is fast once the model is loaded', async () => {
    const wav = fixtureWav()
    const started = Date.now()
    await transcribe(wav)
    const elapsed = Date.now() - started
    console.error(`[whisper pt-BR, warm] ${elapsed} ms for ~13 s of audio`)
    expect(elapsed).toBeLessThan(5000)
  })

  it('returns nothing for silence, even right after speech', async () => {
    await transcribe(fixtureWav())
    expect(await transcribe(silence)).toBe('')
  })

  it('frees the process when stopped', async () => {
    await server.ensure(config)
    const pid = Number(readFileSync(join(dir, 'server.pid'), 'utf8'))
    const rssKb = Number(execFileSync('/bin/ps', ['-o', 'rss=', '-p', String(pid)]).toString())
    console.error(`[whisper q5_0 RSS while loaded] ${Math.round(rssKb / 1024)} MB`)

    await server.stop()
    expect(() => process.kill(pid, 0)).toThrow()
  })

  it('kills a whisper-server orphaned by a previous app run', async () => {
    const pidfile = join(dir, 'orphan.pid')
    const orphan = spawn(bin, ['--model', config.model, '--port', '0'], { stdio: 'ignore' })
    await new Promise((r) => setTimeout(r, 300))
    execFileSync('/bin/sh', ['-c', `echo ${orphan.pid} > "${pidfile}"`])

    await new WhisperServer({ pidfile }).killOrphan()
    await new Promise((r) => setTimeout(r, 200))

    expect(orphan.exitCode !== null || orphan.signalCode !== null).toBe(true)
    expect(existsSync(pidfile)).toBe(false)
  })
})
