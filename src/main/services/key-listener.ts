import { uIOhook, UiohookKey } from 'uiohook-napi'

interface KeyListenerCallbacks {
  onRecordStart: () => void
  onRecordStop: () => void
  onRecordCancel: () => void
  onToggleUI: () => void
}

// Key codes in libuiohook
const VC_PERIOD = 52
const VC_SLASH = 53

// Delay before starting recording, gives time to detect Period for toggle
const COMBO_WINDOW_MS = 250

export function setupKeyListener(callbacks: KeyListenerCallbacks) {
  const state = {
    rightMeta: false,
    rightAlt: false,
    recording: false,
  }

  let recordTimeout: ReturnType<typeof setTimeout> | null = null

  function cancelPendingRecord() {
    if (recordTimeout) {
      clearTimeout(recordTimeout)
      recordTimeout = null
    }
  }

  function tryScheduleRecord() {
    if (state.rightMeta && state.rightAlt && !state.recording) {
      cancelPendingRecord()
      recordTimeout = setTimeout(() => {
        recordTimeout = null
        if (state.rightMeta && state.rightAlt && !state.recording) {
          state.recording = true
          callbacks.onRecordStart()
        }
      }, COMBO_WINDOW_MS)
    }
  }

  uIOhook.on('keydown', (e) => {
    // Right Command key
    if (e.keycode === UiohookKey.MetaRight) {
      state.rightMeta = true
      tryScheduleRecord()
    }

    // Right Option key
    if (e.keycode === UiohookKey.AltRight) {
      state.rightAlt = true
      tryScheduleRecord()
    }

    // Slash key: toggle UI when Right Cmd + Right Alt are held
    if (e.keycode === VC_SLASH && state.rightMeta && state.rightAlt) {
      cancelPendingRecord()

      if (state.recording) {
        state.recording = false
        callbacks.onRecordCancel()
      }

      callbacks.onToggleUI()
    }

    // Right Shift: cancel recording while Right Cmd + Right Alt are held
    if (e.keycode === UiohookKey.ShiftRight && state.rightMeta && state.rightAlt) {
      cancelPendingRecord()

      if (state.recording) {
        state.recording = false
        callbacks.onRecordCancel()
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.MetaRight) {
      state.rightMeta = false
      cancelPendingRecord()

      if (state.recording) {
        state.recording = false
        callbacks.onRecordStop()
      }
    }

    if (e.keycode === UiohookKey.AltRight) {
      state.rightAlt = false
      cancelPendingRecord()

      if (state.recording) {
        state.recording = false
        callbacks.onRecordStop()
      }
    }
  })

  uIOhook.start()

  return () => {
    cancelPendingRecord()
    uIOhook.stop()
  }
}
