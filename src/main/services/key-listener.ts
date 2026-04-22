import { uIOhook, UiohookKey } from 'uiohook-napi'

interface KeyListenerCallbacks {
  onRecordStart: () => void
  onRecordStop: () => void
  onRecordCancel: () => void
  onToggleUI: () => void
  onToggleSlot: () => void
}

// Key codes in libuiohook
const VC_SLASH = 53

// Slot toggle is a double-tap on Right Alt.
// WINDOW: max ms between the two keyup events.
// MAX_HOLD: max ms a single press may be held and still count as a tap
// (longer holds are treated as intentional holds, not taps).
const DOUBLE_TAP_WINDOW_MS = 350
const MAX_TAP_DURATION_MS = 500

export function setupKeyListener(callbacks: KeyListenerCallbacks) {
  const state = {
    rightMeta: false,
    rightAlt: false,
    rightShift: false,
    recording: false,
    altPressStart: 0,
    altConsumed: false,
    lastAltTapAt: 0,
  }

  function tryStartRecord() {
    if (state.rightMeta && state.rightAlt && !state.recording) {
      state.recording = true
      state.altConsumed = true
      callbacks.onRecordStart()
    }
  }

  uIOhook.on('keydown', (e) => {
    // Any non-Alt keypress while Right Alt is held means Alt is acting as a
    // modifier for another gesture or character shortcut, so this Alt press
    // cannot count as a tap in the double-tap detector.
    if (state.rightAlt && e.keycode !== UiohookKey.AltRight) {
      state.altConsumed = true
    }

    // Right Command key
    if (e.keycode === UiohookKey.MetaRight) {
      state.rightMeta = true
      tryStartRecord()
    }

    // Right Option key
    if (e.keycode === UiohookKey.AltRight) {
      state.rightAlt = true
      state.altPressStart = Date.now()
      state.altConsumed = false

      // Toggle UI if Right Shift is already held (no Cmd)
      if (state.rightShift && !state.rightMeta) {
        state.altConsumed = true
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
    if (e.keycode === VC_SLASH) {
      if (state.rightMeta && state.rightAlt && state.recording) {
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
      const now = Date.now()
      const held = now - state.altPressStart
      const wasConsumed = state.altConsumed

      state.rightAlt = false

      if (state.recording) {
        state.recording = false
        callbacks.onRecordStop()
      }

      // Double-tap detection: a "clean" Alt keyup (no other key pressed during
      // the hold, held no longer than MAX_TAP_DURATION_MS) either arms the
      // window or, if the window is already armed, fires onToggleSlot.
      if (!wasConsumed && held <= MAX_TAP_DURATION_MS) {
        if (
          state.lastAltTapAt > 0 &&
          now - state.lastAltTapAt <= DOUBLE_TAP_WINDOW_MS
        ) {
          state.lastAltTapAt = 0
          callbacks.onToggleSlot()
        } else {
          state.lastAltTapAt = now
        }
      } else {
        state.lastAltTapAt = 0
      }

      state.altPressStart = 0
      state.altConsumed = false
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
