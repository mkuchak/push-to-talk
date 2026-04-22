import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic,
  Settings,
  Clock,
  Copy,
  Check,
  ChevronLeft,
  Loader2,
  X,
  Trash2,
  CircleHelp,
  RotateCw,
} from 'lucide-react'
import { LANGUAGES, DEFAULT_LANGUAGE, ALL_MODES, generateModes, displayLabel } from 'shared/languages'

const { App } = window

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () =>
      resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(blob)
  })
}

function playTone(freq: number, endFreq: number, duration = 80) {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration / 1000)

  gain.gain.setValueAtTime(0.35, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)

  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration / 1000)
  setTimeout(() => ctx.close(), duration + 50)
}

function playTwoTone(freq1: number, freq2: number, noteDur = 50, gap = 15) {
  const ctx = new AudioContext()
  const dur = noteDur / 1000
  const gapDur = gap / 1000
  const now = ctx.currentTime

  for (const { freq, start } of [
    { freq: freq1, start: now },
    { freq: freq2, start: now + dur + gapDur },
  ]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.35, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + dur)
  }

  setTimeout(() => ctx.close(), noteDur * 2 + gap + 50)
}

type View = 'main' | 'settings' | 'history' | 'shortcuts'
type Status = 'idle' | 'recording' | 'processing'

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function MainScreen() {
  const [view, setView] = useState<View>('main')
  const [status, setStatus] = useState<Status>('idle')
  const [mode, setMode] = useState('en-US>en-US')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([DEFAULT_LANGUAGE])
  const [lastResult, setLastResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('default')
  const [history, setHistory] = useState<
    Array<{ id: string; text: string; mode: string; timestamp: number }>
  >([])
  const [context, setContext] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [slotA, setSlotA] = useState('')
  const [slotB, setSlotB] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [failedAudio, setFailedAudio] = useState<{
    blob: Blob
    mimeType: string
    mode: string
  } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const generationRef = useRef(0)

  const initAudioStream = useCallback(async (deviceId: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio:
          deviceId && deviceId !== 'default'
            ? { deviceId: { exact: deviceId } }
            : true,
      })
    } catch {
      // Fallback to default device if the stored one is no longer available
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
        setSelectedDevice('default')
        await App.storeSet('deviceId', 'default')
      } catch {
        setError('Microphone access denied')
      }
    }
  }, [])

  // Initialize app state
  useEffect(() => {
    ;(async () => {
      const [data, version] = await Promise.all([
        App.getAll(),
        App.getVersion(),
      ])
      setMode(data.mode)
      setSelectedDevice(data.deviceId)
      setApiKey(data.apiKey)
      setContext(data.context)
      setSelectedLanguages(data.selectedLanguages)
      setHistory(data.history)
      setAppVersion(version)
      setSlotA(data.slotA)
      setSlotB(data.slotB)
      await initAudioStream(data.deviceId)
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      setDevices(allDevices.filter((d) => d.kind === 'audioinput'))
    })()
  }, [initAudioStream])

  // Auto-resize window to fit content
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const sync = () => App.resizeWindow(el.scrollHeight)

    const observer = new MutationObserver(sync)
    const resizeObserver = new ResizeObserver(sync)

    observer.observe(el, { childList: true, subtree: true, characterData: true })
    resizeObserver.observe(el)

    sync()

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return
    playTone(600, 900)
    setError('')
    setFailedAudio(null)
    generationRef.current++
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start(100)
    mediaRecorderRef.current = recorder
    setStatus('recording')
  }, [])

  const stopAndTranscribe = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    playTone(900, 500)
    setStatus('processing')
    setAttempt(1)

    const gen = generationRef.current
    const recordedMode = mode

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }))
      recorder.stop()
    })

    if (blob.size === 0) {
      if (generationRef.current === gen) {
        setStatus('idle')
        setAttempt(0)
      }
      return
    }

    try {
      const base64 = await blobToBase64(blob)
      const result = await App.transcribe(base64, blob.type, recordedMode)

      if (generationRef.current !== gen) return

      setLastResult(result.text)
      setFailedAudio(null)

      if (!result.pasted) App.showWindow()

      const data = await App.getAll()
      setHistory(data.history)
    } catch (err: any) {
      if (generationRef.current !== gen) return
      setError(err.message || 'Transcription failed')
      setFailedAudio({ blob, mimeType: blob.type, mode: recordedMode })
      App.showWindow()
    } finally {
      if (generationRef.current === gen) {
        setStatus('idle')
        setAttempt(0)
      }
    }
  }, [mode])

  const handleRetry = useCallback(async () => {
    const target = failedAudio
    if (!target) return

    setError('')
    setStatus('processing')
    setAttempt(1)
    const gen = ++generationRef.current

    try {
      const base64 = await blobToBase64(target.blob)
      const result = await App.transcribe(base64, target.mimeType, target.mode)

      if (generationRef.current !== gen) return

      setLastResult(result.text)
      setFailedAudio(null)

      if (!result.pasted) App.showWindow()

      const data = await App.getAll()
      setHistory(data.history)
    } catch (err: any) {
      if (generationRef.current !== gen) return
      setError(err.message || 'Transcription failed')
      App.showWindow()
    } finally {
      if (generationRef.current === gen) {
        setStatus('idle')
        setAttempt(0)
      }
    }
  }, [failedAudio])

  const cancelRecording = useCallback(() => {
    playTone(400, 250, 120)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.onstop = null
      recorder.stop()
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setStatus('idle')
  }, [])

  // Stable refs for IPC callbacks (avoid stale closures)
  const startRef = useRef(startRecording)
  const stopRef = useRef(stopAndTranscribe)
  const cancelRef = useRef(cancelRecording)
  startRef.current = startRecording
  stopRef.current = stopAndTranscribe
  cancelRef.current = cancelRecording

  useEffect(() => {
    const unsubStart = App.onRecordingStart(() => startRef.current())
    const unsubStop = App.onRecordingStop(() => stopRef.current())
    const unsubCancel = App.onRecordingCancel(() => cancelRef.current())
    const unsubMode = App.onModeChanged((e) => {
      if (e.empty) {
        playTone(400, 250, 120)
        return
      }
      // Slot A = ascending C5 → C6 octave, Slot B = descending C6 → C5
      if (e.slot === 'A') playTwoTone(523, 1047, 50, 15)
      else if (e.slot === 'B') playTwoTone(1047, 523, 50, 15)
      if (e.mode) setMode(e.mode)
    })
    const unsubAttempt = App.onTranscribeAttempt((e) => setAttempt(e.attempt))
    return () => {
      unsubStart()
      unsubStop()
      unsubCancel()
      unsubMode()
      unsubAttempt()
    }
  }, [])

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleModeChange = async (val: string) => {
    setMode(val)
    await App.storeSet('mode', val)
  }

  const handleDeviceChange = async (val: string) => {
    setSelectedDevice(val)
    await App.storeSet('deviceId', val)
    await initAudioStream(val)
  }

  const handleApiKeySave = async (key: string) => {
    setApiKey(key)
    await App.storeSet('apiKey', key)
  }

  const handleContextSave = async (value: string) => {
    setContext(value)
    await App.storeSet('context', value)
  }

  const handleLanguageToggle = async (locale: string) => {
    if (locale === DEFAULT_LANGUAGE) return
    const updated = selectedLanguages.includes(locale)
      ? selectedLanguages.filter((l) => l !== locale)
      : [...selectedLanguages, locale]
    setSelectedLanguages(updated)
    await App.storeSet('selectedLanguages', updated)

    // Reset mode if current mode uses a deselected language
    const [from, to] = mode.split('>')
    if (!updated.includes(from) || !updated.includes(to)) {
      const fallback = `${DEFAULT_LANGUAGE}>${DEFAULT_LANGUAGE}`
      setMode(fallback)
      await App.storeSet('mode', fallback)
    }

    // Reset any slot that references a deselected language
    const resetIfInvalid = async (
      key: 'slotA' | 'slotB',
      value: string,
      setter: (v: string) => void,
    ) => {
      if (!value) return
      const [f, t] = value.split('>')
      if (!updated.includes(f) || !updated.includes(t)) {
        setter('')
        await App.storeSet(key, '')
      }
    }
    await resetIfInvalid('slotA', slotA, setSlotA)
    await resetIfInvalid('slotB', slotB, setSlotB)
  }

  const handleSlotChange = async (slot: 'A' | 'B', value: string) => {
    if (slot === 'A') setSlotA(value)
    else setSlotB(value)
    await App.storeSet(slot === 'A' ? 'slotA' : 'slotB', value)
  }

  const handleDeleteEntry = async (id: string) => {
    await App.deleteHistoryEntry(id)
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  const handleClearHistory = async () => {
    await App.storeSet('history', [])
    setHistory([])
  }

  // ── Render ──
  return (
    <div ref={containerRef} className="p-3">
      {/* ── Settings View ── */}
      {view === 'settings' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('main')}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} className="text-white/70" />
            </button>
            <span className="text-sm font-medium text-white/90">Settings</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] text-white/50 mb-1 block">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeySave(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/50 mb-1 block">
                Audio Input
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/25 transition-colors cursor-pointer"
              >
                <option value="default">Default</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-white/50 mb-1 block">
                Languages
              </label>
              <div className="space-y-1">
                {Object.keys(LANGUAGES).map((locale) => {
                  const isDefault = locale === DEFAULT_LANGUAGE
                  const isSelected = selectedLanguages.includes(locale)
                  return (
                    <label
                      key={locale}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-white/10' : 'bg-white/5 hover:bg-white/[0.07]'
                      } ${isDefault ? 'opacity-70 cursor-default' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDefault}
                        onChange={() => handleLanguageToggle(locale)}
                        className="accent-blue-500 rounded"
                      />
                      <span className="text-sm text-white/80">
                        {displayLabel(locale)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/50 mb-1 block">
                Toggle Slots
              </label>
              <p className="text-[11px] text-white/30 mb-1.5">
                Double-tap Right ⌥ to swap between Slot A and Slot B
              </p>
              <div className="space-y-1">
                {(['A', 'B'] as const).map((slot) => {
                  const value = slot === 'A' ? slotA : slotB
                  return (
                    <div key={slot} className="flex items-center gap-2">
                      <span className="text-[11px] text-white/50 w-10 shrink-0">
                        Slot {slot}
                      </span>
                      <select
                        value={value}
                        onChange={(e) => handleSlotChange(slot, e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/25 transition-colors cursor-pointer"
                      >
                        <option value="">Not set</option>
                        {generateModes(selectedLanguages).map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/50 mb-1 block">
                Optional Context
              </label>
              <textarea
                value={context}
                onChange={(e) => handleContextSave(e.target.value)}
                placeholder="e.g., I am a full-stack software engineer..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors resize-none"
              />
              <p className="text-[11px] text-white/30 mt-0.5">
                Helps the AI recognize domain-specific terms
              </p>
            </div>

            {appVersion && (
              <p className="text-[11px] text-white/25 text-center pt-1">
                v{appVersion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── History View ── */}
      {view === 'history' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('main')}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={16} className="text-white/70" />
              </button>
              <span className="text-sm font-medium text-white/90">
                History
              </span>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Clear all"
              >
                <Trash2 size={14} className="text-white/40" />
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto space-y-0.5">
            {history.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">
                No transcriptions yet
              </p>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90 truncate">
                      {entry.text}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {ALL_MODES.find((m) => m.value === entry.mode)?.label} ·{' '}
                      {timeAgo(entry.timestamp)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleCopy(entry.text)}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      <Copy size={13} className="text-white/50" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      <Trash2 size={13} className="text-white/40" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Shortcuts View ── */}
      {view === 'shortcuts' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('main')}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} className="text-white/70" />
            </button>
            <span className="text-sm font-medium text-white/90">
              Shortcuts
            </span>
          </div>

          <div className="space-y-2">
            {[
              { keys: ['Right ⌘', 'Right ⌥'], desc: 'Hold to record' },
              { keys: ['Release either key'], desc: 'Stop & transcribe' },
              { keys: ['Right ⌥', 'Right ⇧'], desc: 'Show / hide window' },
              { keys: ['Right ⌘', 'Right ⌥', '/'], desc: 'Cancel recording' },
              { keys: ['Double tap Right ⌥'], desc: 'Toggle slot' },
            ].map((s) => (
              <div
                key={s.desc}
                className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-white/5"
              >
                <span className="text-sm text-white/80">{s.desc}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k, i) => (
                    <span key={k} className="flex items-center gap-1">
                      {i > 0 && <span className="text-white/30 text-xs">+</span>}
                      <kbd className="text-xs text-white/90 bg-white/15 border border-white/10 px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1.5">
                        {k.split(/([⌘⌥⇧\/])/).map((part, j) =>
                          /^[⌘⌥⇧\/]$/.test(part)
                            ? <span key={j} className="text-base leading-none">{part}</span>
                            : <span key={j}>{part}</span>
                        )}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main View ── */}
      {view === 'main' && (
        <>
          {/* Toolbar */}
          <div
            className="flex items-center justify-between gap-3"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            {/* Status indicator */}
            <div className="min-w-0">
              {status === 'recording' ? (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs text-red-400 font-medium">
                    Recording...
                  </span>
                </div>
              ) : status === 'processing' ? (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">
                  <Loader2
                    size={12}
                    className="animate-spin text-blue-400"
                  />
                  <span className="text-xs text-blue-400 font-medium">
                    {attempt >= 2 ? `Retrying... (${attempt}/3)` : 'Processing...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-0.5">
                  <Mic size={14} className="text-white/40" />
                  <span className="text-xs text-white/40">
                    Hold Right ⌘⌥ to talk
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div
              className="flex items-center gap-0.5 shrink-0"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <select
                value={mode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 text-[11px] text-white/70 outline-none cursor-pointer hover:bg-white/10 transition-colors"
              >
                {generateModes(selectedLanguages).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setView('settings')
                  App.showWindow()
                }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                title="Settings"
              >
                <Settings size={14} className="text-white/40" />
              </button>

              <button
                onClick={() => {
                  setView('history')
                  App.showWindow()
                }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                title="History"
              >
                <Clock size={14} className="text-white/40" />
              </button>

              <button
                onClick={() => {
                  setView('shortcuts')
                  App.showWindow()
                }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                title="Shortcuts"
              >
                <CircleHelp size={14} className="text-white/40" />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-2 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-red-400 flex-1">{error}</span>
              {failedAudio && (
                <button
                  onClick={handleRetry}
                  className="p-0.5 hover:bg-white/10 rounded"
                  title="Retry transcription"
                >
                  <RotateCw size={12} className="text-red-400" />
                </button>
              )}
              <button
                onClick={() => {
                  setError('')
                  setFailedAudio(null)
                }}
                className="p-0.5 hover:bg-white/10 rounded"
              >
                <X size={12} className="text-red-400" />
              </button>
            </div>
          )}

          {/* Last transcription result */}
          {lastResult && status === 'idle' && (
            <div className="mt-2 flex items-start gap-2">
              <p className="flex-1 text-sm text-white/90 leading-relaxed">
                {lastResult}
              </p>
              <button
                onClick={() => handleCopy(lastResult)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
                title="Copy"
              >
                {copied ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} className="text-white/40" />
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
