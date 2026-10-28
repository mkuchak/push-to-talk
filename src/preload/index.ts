import { contextBridge, ipcRenderer } from 'electron'

import type {
  WhisperKeepAlive,
  WhisperModelId,
  WhisperStatus,
} from 'shared/whisper'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  // Transcription
  transcribe: (
    audioBase64: string,
    mimeType: string,
    modeOverride?: string,
    wav?: Uint8Array,
  ) =>
    ipcRenderer.invoke(
      'transcribe',
      audioBase64,
      mimeType,
      modeOverride,
      wav,
    ) as Promise<{
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
      model: string
      mode: string
      deviceId: string
      context: string
      selectedLanguages: string[]
      history: Array<{
        id: string
        text: string
        mode: string
        timestamp: number
        engine?: 'gemini' | 'whisper'
      }>
      slotA: string
      slotB: string
      activeSlot: 'A' | 'B'
      whisperModel: WhisperModelId
      whisperKeepAlive: WhisperKeepAlive
      whisperPolish: boolean
    }>,

  // Local Whisper
  whisperStatus: () =>
    ipcRenderer.invoke('whisper:status') as Promise<WhisperStatus>,

  whisperInstall: () => ipcRenderer.invoke('whisper:install') as Promise<void>,

  whisperCancel: () => ipcRenderer.invoke('whisper:cancel') as Promise<void>,

  whisperUninstall: () =>
    ipcRenderer.invoke('whisper:uninstall') as Promise<void>,

  onWhisperStatus: (callback: (status: WhisperStatus) => void) => {
    const handler = (_: unknown, status: WhisperStatus) => callback(status)
    ipcRenderer.on('whisper:status', handler)
    return () => {
      ipcRenderer.removeListener('whisper:status', handler)
    }
  },

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

  onModeChanged: (
    callback: (e: { empty: boolean; mode?: string; slot?: 'A' | 'B' }) => void,
  ) => {
    const handler = (
      _: unknown,
      data: { empty: boolean; mode?: string; slot?: 'A' | 'B' },
    ) => callback(data)
    ipcRenderer.on('mode:changed', handler)
    return () => {
      ipcRenderer.removeListener('mode:changed', handler)
    }
  },

  onTranscribeAttempt: (
    callback: (e: { attempt: number; max: number }) => void,
  ) => {
    const handler = (_: unknown, data: { attempt: number; max: number }) =>
      callback(data)
    ipcRenderer.on('transcribe:attempt', handler)
    return () => {
      ipcRenderer.removeListener('transcribe:attempt', handler)
    }
  },
}

contextBridge.exposeInMainWorld('App', API)
