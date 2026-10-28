import { app, net } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, rm, statfs } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import {
  DEFAULT_WHISPER_MODEL,
  isWhisperModelId,
  WHISPER_MODELS,
  WHISPER_SERVER_RELEASE,
  WHISPER_VAD_MODEL,
  type WhisperInstallPhase,
  type WhisperKeepAlive,
  type WhisperModelId,
  type WhisperStatus,
} from 'shared/whisper'

import { store } from '../store'
import { downloadFile } from './download'
import { buildWhisperPrompt, cleanWhisperText, whisperLanguage } from './prompt'
import { type ServerConfig, WhisperServer } from './server'

const run = promisify(execFile)

const SUPPORTED = process.platform === 'darwin' && process.arch === 'arm64'

// The process started on hotkey press must survive until the user releases
// the keys, even in "only while transcribing" mode.
const WARMUP_GRACE_MS = 60_000

const IDLE_MS: Record<WhisperKeepAlive, number | null> = {
  transcribe: 0,
  '5m': 5 * 60_000,
  always: null,
}

function idleMs(): number | null {
  const keepAlive = store.get('whisperKeepAlive')
  return keepAlive in IDLE_MS ? IDLE_MS[keepAlive] : IDLE_MS['5m']
}

function paths() {
  const root = join(app.getPath('userData'), 'whisper')
  return {
    root,
    binDir: join(root, 'bin'),
    // Versioned so a new release is a fresh download, not an in-place swap
    bin: join(root, 'bin', WHISPER_SERVER_RELEASE.version, 'whisper-server'),
    models: join(root, 'models'),
    downloads: join(root, 'downloads'),
    pidfile: join(root, 'server.pid'),
  }
}

function selectedModel(): WhisperModelId {
  const value = store.get('whisperModel')
  return isWhisperModelId(value) ? value : DEFAULT_WHISPER_MODEL
}

function serverConfig(): ServerConfig {
  const p = paths()
  return {
    bin: p.bin,
    model: join(p.models, WHISPER_MODELS[selectedModel()].file),
    vad: join(p.models, WHISPER_VAD_MODEL.file),
  }
}

function dirSize(dir: string): number {
  if (!existsSync(dir)) return 0
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = join(dir, entry.name)
    return sum + (entry.isDirectory() ? dirSize(full) : statSync(full).size)
  }, 0)
}

let notify: (status: WhisperStatus) => void = () => {}
let installing: Promise<void> | null = null
let installAbort: AbortController | null = null
let installProgress: WhisperStatus['install'] = null
let installError = ''

// Created lazily: userData isn't final until the app has its name set
let serverInstance: WhisperServer | null = null
function server(): WhisperServer {
  serverInstance ??= new WhisperServer({
    pidfile: paths().pidfile,
    onRunningChange: () => emitStatus(),
  })
  return serverInstance
}

function missingBytes(): number {
  const p = paths()
  const model = WHISPER_MODELS[selectedModel()]
  return [
    existsSync(p.bin) ? 0 : WHISPER_SERVER_RELEASE.size,
    existsSync(join(p.models, WHISPER_VAD_MODEL.file)) ? 0 : WHISPER_VAD_MODEL.size,
    existsSync(join(p.models, model.file)) ? 0 : model.size,
  ].reduce((a, b) => a + b, 0)
}

function isInstalled(): boolean {
  const config = serverConfig()
  return SUPPORTED && existsSync(config.bin) && existsSync(config.vad) && existsSync(config.model)
}

export function getWhisperStatus(): WhisperStatus {
  const p = paths()
  const installedModels = (Object.keys(WHISPER_MODELS) as WhisperModelId[]).filter(
    (id) => existsSync(join(p.models, WHISPER_MODELS[id].file)),
  )
  return {
    supported: SUPPORTED,
    enabled: store.get('whisperEnabled'),
    installed: isInstalled(),
    installedModels,
    missingBytes: missingBytes(),
    diskBytes: dirSize(p.root),
    running: serverInstance?.running ?? false,
    install: installProgress,
    error: installError,
  }
}

function emitStatus() {
  notify(getWhisperStatus())
}

/**
 * True when same-language transcriptions should go to local Whisper. Files
 * only land on disk once verified, so a download in progress reads as not
 * installed.
 */
export function isWhisperReady(): boolean {
  return store.get('whisperEnabled') && isInstalled()
}

function applyKeepAlive() {
  if (!isWhisperReady()) {
    void server().stop()
    return
  }
  const idle = idleMs()
  if (idle === null) {
    server().ensure(serverConfig()).catch((err) => console.error('[whisper]', err))
  }
  server().scheduleIdleStop(idle)
}

export function initWhisper(onStatus: (status: WhisperStatus) => void) {
  notify = onStatus
  if (!SUPPORTED) return

  void server().killOrphan().then(applyKeepAlive)

  // Restart on model change (next request loads the new one) and apply
  // keep-alive / enable toggles as soon as the renderer saves them.
  store.onDidChange('whisperModel', () => {
    void server().stop()
    emitStatus()
  })
  store.onDidChange('whisperEnabled', () => {
    applyKeepAlive()
    emitStatus()
  })
  store.onDidChange('whisperKeepAlive', applyKeepAlive)
}

/** Called on hotkey press: load the model while the user is still talking. */
export function warmUpWhisper(mode: string) {
  const [from, to] = mode.split('>')
  if (from !== to || !isWhisperReady()) return

  server().ensure(serverConfig()).catch((err) => console.error('[whisper] warm-up failed:', err))
  const idle = idleMs()
  if (idle !== null) server().scheduleIdleStop(Math.max(idle, WARMUP_GRACE_MS))
}

export async function transcribeWithWhisper(
  wav: Uint8Array,
  locale: string,
  context: string,
): Promise<string> {
  try {
    const raw = await server().transcribe(serverConfig(), wav, {
      language: whisperLanguage(locale),
      prompt: buildWhisperPrompt(locale, context),
    })
    return cleanWhisperText(raw)
  } finally {
    server().scheduleIdleStop(idleMs())
  }
}

function setProgress(phase: WhisperInstallPhase, received = 0, total = 0) {
  installProgress = { phase, received, total }
}

// Progress events are throttled so a fast download doesn't flood IPC
let lastEmit = 0
function emitProgress(phase: WhisperInstallPhase, received: number, total: number) {
  setProgress(phase, received, total)
  const now = Date.now()
  if (now - lastEmit >= 250 || received === total) {
    lastEmit = now
    emitStatus()
  }
}

async function installBinary(signal: AbortSignal) {
  const p = paths()
  if (existsSync(p.bin)) return

  // Integrity check against the checksum published next to the asset; the
  // app already trusts this repo's releases for auto-updates the same way.
  const shaRes = await net.fetch(`${WHISPER_SERVER_RELEASE.url}.sha256`, { signal })
  if (!shaRes.ok) throw new Error(`Could not fetch whisper-server checksum (HTTP ${shaRes.status})`)
  const sha256 = (await shaRes.text()).trim().split(/\s+/)[0]

  const tarball = join(p.downloads, 'whisper-server.tar.gz')
  await downloadFile({
    url: WHISPER_SERVER_RELEASE.url,
    dest: tarball,
    sha256,
    size: WHISPER_SERVER_RELEASE.size,
    signal,
    fetch: net.fetch,
    onProgress: (received, total) => emitProgress('binary', received, total),
  })

  const target = join(p.bin, '..')
  await mkdir(target, { recursive: true })
  await run('/usr/bin/tar', ['-xzf', tarball, '-C', target])
  await chmod(p.bin, 0o755)
  // net.fetch doesn't quarantine, but a quarantined ad-hoc binary gets killed
  // on launch, so clear the flag defensively
  await run('/usr/bin/xattr', ['-dr', 'com.apple.quarantine', target]).catch(() => {})
  await rm(tarball, { force: true })

  // Drop binaries from previous releases
  for (const version of await readdir(p.binDir)) {
    if (version !== WHISPER_SERVER_RELEASE.version) {
      await rm(join(p.binDir, version), { recursive: true, force: true })
    }
  }
}

async function installModel(
  phase: WhisperInstallPhase,
  file: { file: string; url: string; size: number; sha256: string },
  signal: AbortSignal,
) {
  const dest = join(paths().models, file.file)
  if (existsSync(dest)) return
  await downloadFile({
    url: file.url,
    dest,
    sha256: file.sha256,
    size: file.size,
    signal,
    fetch: net.fetch,
    onProgress: (received, total) => emitProgress(phase, received, total),
  })
}

async function ensureFreeSpace() {
  const p = paths()
  const missing = missingBytes()

  await mkdir(p.root, { recursive: true })
  const fs = await statfs(p.root)
  const free = fs.bavail * fs.bsize
  if (free < missing * 1.1) {
    const needMb = Math.ceil((missing * 1.1) / 1e6)
    throw new Error(`Not enough disk space: ${needMb} MB needed`)
  }
}

async function runInstall(signal: AbortSignal) {
  const modelId = selectedModel()
  await ensureFreeSpace()

  await installBinary(signal)
  await installModel('vad', WHISPER_VAD_MODEL, signal)
  await installModel('model', WHISPER_MODELS[modelId], signal)

  // Only keep the selected model on disk
  for (const id of Object.keys(WHISPER_MODELS) as WhisperModelId[]) {
    if (id !== modelId) {
      await rm(join(paths().models, WHISPER_MODELS[id].file), { force: true })
      await rm(join(paths().models, `${WHISPER_MODELS[id].file}.part`), { force: true })
    }
  }

  // First launch of a new binary compiles the Metal shaders (~6 s, cached by
  // macOS afterwards); pay that now instead of on the first dictation.
  setProgress('warmup')
  emitStatus()
  await server().ensure(serverConfig())
}

/** Downloads whatever is missing (binary, VAD, selected model) and enables local Whisper. */
export function installWhisper(): Promise<void> {
  if (!SUPPORTED) return Promise.reject(new Error('Local Whisper requires an Apple Silicon Mac'))
  if (installing) return installing

  installAbort = new AbortController()
  installError = ''
  setProgress('binary')
  emitStatus()

  installing = runInstall(installAbort.signal)
    .then(() => {
      store.set('whisperEnabled', true)
    })
    .catch((err: Error) => {
      installError = err.name === 'AbortError' ? '' : err.message
    })
    .finally(() => {
      installing = null
      installAbort = null
      installProgress = null
      applyKeepAlive()
      emitStatus()
    })
  return installing
}

export function cancelWhisperInstall() {
  installAbort?.abort()
}

/** Stops the server and deletes every downloaded file. */
export async function uninstallWhisper(): Promise<void> {
  cancelWhisperInstall()
  await installing
  store.set('whisperEnabled', false)
  await server().stop()
  await rm(paths().root, { recursive: true, force: true })
  installError = ''
  emitStatus()
}

/** Synchronous kill for app quit. */
export function shutdownWhisper() {
  server().kill()
}
