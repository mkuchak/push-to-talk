import { uIOhook, UiohookKey } from 'uiohook-napi'

interface KeyListenerCallbacks {
  onRecordStart: () => void
  onRecordStop: () => void
  onRecordCancel: () => void
  onToggleUI: () => void
}

// Key codes in libuiohook
const VC_SLASH = 53

export function setupKeyListener(callbacks: KeyListenerCallbacks) {
  const state = {
    rightMeta: false,
    rightAlt: false,
    rightShift: false,
    recording: false,
  }

  function tryStartRecord() {
    if (state.rightMeta && state.rightAlt && !state.recording) {
      state.recording = true
      callbacks.onRecordStart()
    }
  }

  uIOhook.on('keydown', (e) => {
    // Right Command key
    if (e.keycode === UiohookKey.MetaRight) {
      state.rightMeta = true
      tryStartRecord()
    }

    // Right Option key
    if (e.keycode === UiohookKey.AltRight) {
      state.rightAlt = true

      // Toggle UI if Right Shift is already held (no Cmd)
      if (state.rightShift && !state.rightMeta) {
        callbacks.onToggleUI()
        return
      }

      tryStartRecord()
    }

    // Right Shift: toggle UI when Right Alt is held (no Cmd required)
    if (e.keycode === UiohookKey.ShiftRight) {
      state.rightShift = true

      if (state.rightAlt && !state.rightMeta) {
        if (state.recording) {
          state.recording = false
          callbacks.onRecordCancel()
        }

        callbacks.onToggleUI()
      }
    }

    // Slash key: cancel recording while Right Cmd + Right Alt are held
    if (e.keycode === VC_SLASH && state.rightMeta && state.rightAlt) {
      if (state.recording) {
        state.recording = false
        callbacks.onRecordCancel()
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.MetaRight) {
      state.rightMeta = false

      if (state.recording) {
        state.recording = false
        callbacks.onRecordStop()
      }
    }

    if (e.keycode === UiohookKey.AltRight) {
      state.rightAlt = false

      if (state.recording) {
        state.recording = false
        callbacks.onRecordStop()
      }
    }

    if (e.keycode === UiohookKey.ShiftRight) {
      state.rightShift = false
    }
  })

  uIOhook.start()

  return () => {
    uIOhook.stop()
  }
}
