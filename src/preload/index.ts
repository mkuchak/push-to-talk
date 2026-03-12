import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  // Transcription
  transcribe: (audioBase64: string, mimeType: string) =>
    ipcRenderer.invoke('transcribe', audioBase64, mimeType) as Promise<{
      text: string
      pasted: boolean
    }>,

  // Paste text into active app
  pasteText: (text: string) =>
    ipcRenderer.invoke('paste-text', text) as Promise<boolean>,

  // Settings store
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),

  storeSet: (key: string, value: unknown) =>
    ipcRenderer.invoke('store:set', key, value),

  deleteHistoryEntry: (id: string) =>
    ipcRenderer.invoke('store:delete-history-entry', id),

  getAll: () =>
    ipcRenderer.invoke('store:get-all') as Promise<{
      apiKey: string
      mode: string
      deviceId: string
      context: string
      selectedLanguages: string[]
      history: Array<{
        id: string
        text: string
        mode: string
        timestamp: number
      }>
    }>,

  // App info
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,

  // Window control
  resizeWindow: (height: number) =>
    ipcRenderer.invoke('window:resize', height),

  hideWindow: () => ipcRenderer.invoke('window:hide'),

  showWindow: () => ipcRenderer.invoke('window:show'),

  // Recording events from main process
  onRecordingStart: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('recording:start', handler)
    return () => {
      ipcRenderer.removeListener('recording:start', handler)
    }
  },

  onRecordingStop: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('recording:stop', handler)
    return () => {
      ipcRenderer.removeListener('recording:stop', handler)
    }
  },

  onRecordingCancel: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('recording:cancel', handler)
    return () => {
      ipcRenderer.removeListener('recording:cancel', handler)
    }
  },
}

contextBridge.exposeInMainWorld('App', API)
