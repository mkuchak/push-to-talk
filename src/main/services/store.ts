import Store from 'electron-store'

import { DEFAULT_GEMINI_MODEL } from 'shared/constants'
import {
  DEFAULT_WHISPER_MODEL,
  type WhisperKeepAlive,
  type WhisperModelId,
} from 'shared/whisper'

export type TranscriptionEngine = 'gemini' | 'whisper'

interface HistoryEntry {
  id: string
  text: string
  mode: string
  timestamp: number
  engine?: TranscriptionEngine
}

interface StoreSchema {
  apiKey: string
  model: string
  mode: string
  deviceId: string
  context: string
  selectedLanguages: string[]
  history: HistoryEntry[]
  slotA: string
  slotB: string
  activeSlot: 'A' | 'B'
  whisperEnabled: boolean
  whisperModel: WhisperModelId
  whisperKeepAlive: WhisperKeepAlive
  whisperPolish: boolean
}

export const store = new Store<StoreSchema>({
  name: 'push-to-talk',
  defaults: {
    apiKey: '',
    model: DEFAULT_GEMINI_MODEL,
    mode: 'en-US>en-US',
    deviceId: 'default',
    context: '',
    selectedLanguages: ['en-US'],
    history: [],
    slotA: '',
    slotB: '',
    activeSlot: 'A',
    whisperEnabled: false,
    whisperModel: DEFAULT_WHISPER_MODEL,
    whisperKeepAlive: '5m',
    whisperPolish: false,
  },
})

// Seed Slot A from the current mode on first run / upgrade so the shortcut
// has one working slot out of the box.
if (!store.get('slotA')) {
  store.set('slotA', store.get('mode'))
}

export function addToHistory(
  text: string,
  mode: string,
  engine: TranscriptionEngine,
) {
  const history = store.get('history')
  history.unshift({
    id: crypto.randomUUID(),
    text,
    mode,
    timestamp: Date.now(),
    engine,
  })
  store.set('history', history.slice(0, 100))
}

export function removeFromHistory(id: string) {
  const history = store.get('history')
  store.set(
    'history',
    history.filter((entry) => entry.id !== id),
  )
}
