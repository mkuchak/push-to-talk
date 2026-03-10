import Store from 'electron-store'

export interface HistoryEntry {
  id: string
  text: string
  mode: string
  timestamp: number
}

interface StoreSchema {
  apiKey: string
  mode: string
  deviceId: string
  history: HistoryEntry[]
}

export const store = new Store<StoreSchema>({
  name: 'push-to-talk',
  defaults: {
    apiKey: '',
    mode: 'pt>en',
    deviceId: 'default',
    history: [],
  },
})

export function addToHistory(text: string, mode: string) {
  const history = store.get('history')
  history.unshift({
    id: crypto.randomUUID(),
    text,
    mode,
    timestamp: Date.now(),
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
