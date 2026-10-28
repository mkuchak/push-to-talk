import { polishTranscript, transcribeAudio } from './gemini'
import { isRetryable, withRetry } from './retry'
import { type TranscriptionEngine, store } from './store'
import { isWhisperReady, transcribeWithWhisper } from './whisper'

const GEMINI_ATTEMPTS = 3

class NoSpeechError extends Error {
  constructor() {
    super('No speech detected')
  }
}

interface TranscribeRequest {
  audioBase64: string
  mimeType: string
  /** 16 kHz mono WAV, sent by the renderer when local Whisper may apply */
  wav?: Uint8Array
  mode: string
  onAttempt?: (attempt: number, max: number) => void
}

interface TranscribeResult {
  text: string
  engine: TranscriptionEngine
}

async function viaWhisper(wav: Uint8Array, locale: string): Promise<string> {
  const raw = await transcribeWithWhisper(wav, locale, store.get('context'))
  if (!raw) throw new NoSpeechError()

  if (!store.get('whisperPolish') || !store.get('apiKey')) return raw
  // Polishing is best effort: the local transcript is already usable
  return polishTranscript(raw, locale).catch((err) => {
    console.warn('[whisper] polish failed, using raw transcript:', err)
    return raw
  })
}

async function viaGemini(req: TranscribeRequest): Promise<string> {
  try {
    const { value } = await withRetry(
      () => transcribeAudio(req.audioBase64, req.mimeType, req.mode),
      {
        attempts: GEMINI_ATTEMPTS,
        backoffMs: [500, 1200],
        jitter: 0.2,
        retryAfterCapMs: 3000,
        isRetryable,
        onAttempt: (attempt) => req.onAttempt?.(attempt, GEMINI_ATTEMPTS),
      },
    )
    return value
  } catch (err) {
    const inner = err instanceof Error ? err.message : 'Transcription failed'
    const n = (err as { attemptsMade?: number } | null)?.attemptsMade ?? 1
    const label = n === 1 ? 'attempt' : 'attempts'
    throw new Error(`Failed after ${n} ${label}: ${inner}`)
  }
}

/**
 * Same-language modes go to local Whisper when it's enabled and installed;
 * translations (and any local failure, when a Gemini key exists) go to Gemini.
 */
export async function transcribe(req: TranscribeRequest): Promise<TranscribeResult> {
  const [from, to] = req.mode.split('>')

  if (req.wav && from === to && isWhisperReady()) {
    req.onAttempt?.(1, 1)
    try {
      return { text: await viaWhisper(req.wav, from), engine: 'whisper' }
    } catch (err) {
      // Silence isn't a failure worth a cloud round-trip
      if (err instanceof NoSpeechError || !store.get('apiKey')) throw err
      console.warn('[whisper] falling back to Gemini:', err)
    }
  }

  return { text: await viaGemini(req), engine: 'gemini' }
}
