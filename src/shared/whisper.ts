export type WhisperModelId = 'large-v3-turbo-q5_0' | 'large-v3-turbo-q8_0'

// How long whisper-server (and the model it holds in RAM) stays alive after
// a transcription. The process is the only thing that truly frees the memory.
export type WhisperKeepAlive = 'transcribe' | '5m' | 'always'

interface ModelFile {
  file: string
  url: string
  size: number
  sha256: string
}

// Pinned to a Hugging Face commit so the files can't change underneath us
const HF_WHISPER = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1'
const HF_VAD = 'https://huggingface.co/ggml-org/whisper-vad/resolve/9ffd54a1e1ee413ddf265af9913beaf518d1639b'

export const WHISPER_MODELS: Record<WhisperModelId, ModelFile & { label: string }> = {
  'large-v3-turbo-q5_0': {
    label: 'Turbo q5_0 (faster, lighter)',
    file: 'ggml-large-v3-turbo-q5_0.bin',
    url: `${HF_WHISPER}/ggml-large-v3-turbo-q5_0.bin`,
    size: 574_041_195,
    sha256: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2',
  },
  'large-v3-turbo-q8_0': {
    label: 'Turbo q8_0 (higher quality)',
    file: 'ggml-large-v3-turbo-q8_0.bin',
    url: `${HF_WHISPER}/ggml-large-v3-turbo-q8_0.bin`,
    size: 874_188_075,
    sha256: '317eb69c11673c9de1e1f0d459b253999804ec71ac4c23c17ecf5fbe24e259a1',
  },
}

export const DEFAULT_WHISPER_MODEL: WhisperModelId = 'large-v3-turbo-q5_0'

export const WHISPER_VAD_MODEL: ModelFile = {
  file: 'ggml-silero-v6.2.0.bin',
  url: `${HF_VAD}/ggml-silero-v6.2.0.bin`,
  size: 885_098,
  sha256: '2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987',
}

// Built by .github/workflows/whisper-server.yml from scripts/build-whisper-server.sh
export const WHISPER_SERVER_RELEASE = {
  version: 'v1.9.5',
  url: 'https://github.com/mkuchak/push-to-talk/releases/download/whisper-server-v1.9.5/whisper-server-darwin-arm64.tar.gz',
  // Approximate, only used for progress and the free-space check
  size: 2_200_000,
}

export const WHISPER_KEEP_ALIVE_OPTIONS: Array<{ value: WhisperKeepAlive; label: string }> = [
  { value: 'transcribe', label: 'Only while transcribing' },
  { value: '5m', label: '5 minutes after use' },
  { value: 'always', label: 'Always' },
]

export function isWhisperModelId(value: unknown): value is WhisperModelId {
  return typeof value === 'string' && value in WHISPER_MODELS
}

export type WhisperInstallPhase = 'binary' | 'vad' | 'model' | 'warmup'

export interface WhisperStatus {
  /** Local Whisper only ships for Apple Silicon Macs */
  supported: boolean
  /** User turned local Whisper on (it only applies once installed too) */
  enabled: boolean
  /** Server binary, VAD and the selected model are all on disk */
  installed: boolean
  installedModels: WhisperModelId[]
  /** Bytes still to download for the selected model's setup */
  missingBytes: number
  diskBytes: number
  running: boolean
  install: { phase: WhisperInstallPhase; received: number; total: number } | null
  error: string
}
