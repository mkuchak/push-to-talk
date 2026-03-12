import { app, BrowserWindow, ipcMain, Menu, screen, session, systemPreferences } from 'electron'

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { ignoreConsoleWarnings } from 'lib/electron-app/utils'
import { ENVIRONMENT, PLATFORM } from 'shared/constants'
import { makeAppId } from 'shared/utils'

import { MainWindow } from './windows/main'
import { store, addToHistory, removeFromHistory } from './services/store'
import { transcribeAudio } from './services/gemini'
import { pasteText } from './services/paste'
import { setupKeyListener } from './services/key-listener'
import { setupTray } from './services/tray'
import pkg from 'electron-updater'
const { autoUpdater } = pkg

// Platform setup
app.setName('Push to Talk')
if (PLATFORM.IS_LINUX) app.disableHardwareAcceleration()
if (PLATFORM.IS_WINDOWS)
  app.setAppUserModelId(ENVIRONMENT.IS_DEV ? process.execPath : makeAppId())
app.commandLine.appendSwitch('force-color-profile', 'srgb')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
ignoreConsoleWarnings(['Manifest version 2 is deprecated'])

// Custom menu so macOS menu bar shows "Push to Talk" instead of "Electron"
Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: 'Push to Talk',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ]),
)

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let isShowingWindow = false

/** Re-enforce accessory policy after any show()/focus() call */
function ensureDockHidden() {
  if (!PLATFORM.IS_MAC) return
  setTimeout(() => {
    app.dock.hide()
    app.setActivationPolicy('accessory')
  }, 50)
}

function showWindowOnCurrentScreen(stealFocus = false) {
  if (!mainWindow) return

  // Guard: prevent the space-change notification from hiding
  // the window while we're intentionally showing it
  isShowingWindow = true

  // Hide first so macOS doesn't switch back to the old Space on show()
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  }

  // Find which display the cursor is on
  const cursorPoint = screen.getCursorScreenPoint()
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x: dx, y: dy, width: dw } = currentDisplay.workArea

  // Center horizontally on that display, 80px from top
  const windowWidth = 528
  const newX = Math.round(dx + (dw - windowWidth) / 2)
  const newY = dy + 80

  // macOS Spaces: make visible on all workspaces so show() places
  // the window on the current Space instead of switching to the old one
  if (PLATFORM.IS_MAC) {
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    })
  }

  mainWindow.setPosition(newX, newY)

  if (stealFocus) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    // Show without stealing focus — keeps cursor in the active app
    mainWindow.showInactive()
  }

  ensureDockHidden()

  // Pin to current Space after a delay so macOS finishes placing the window
  if (PLATFORM.IS_MAC) {
    setTimeout(() => {
      mainWindow?.setVisibleOnAllWorkspaces(false, {
        skipTransformProcessType: true,
      })
      isShowingWindow = false
    }, 100)
  } else {
    isShowingWindow = false
  }
}

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  // Grant all renderer permission requests (microphone, camera, etc.)
  session.defaultSession.setPermissionCheckHandler(() => true)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true))

  // Request microphone permission on macOS
  if (PLATFORM.IS_MAC) {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    console.log('[mic] current status:', status)
    if (status !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      console.log('[mic] askForMediaAccess result:', granted)
    }
  }

  // Hide from dock — app lives in the tray (use both mechanisms for reliability)
  if (PLATFORM.IS_MAC) {
    app.dock.hide()
    app.setActivationPolicy('accessory')
  }

  mainWindow = await MainWindow()

  // Tray icon (click to toggle, right-click for menu)
  setupTray({
    onToggleWindow: () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide()
      } else {
        showWindowOnCurrentScreen()
      }
    },
    onQuit: () => {
      isQuitting = true
    },
  })

  // Always show window on launch
  mainWindow.webContents.on('did-finish-load', () => {
    showWindowOnCurrentScreen(true)
  })

  // Hide instead of close
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // Show window when clicking dock icon
  app.on('activate', () => showWindowOnCurrentScreen(true))

  // Focus existing window on second instance launch
  app.on('second-instance', () => showWindowOnCurrentScreen(true))

  app.on('before-quit', () => {
    isQuitting = true
  })

  // Keep running when window is hidden
  app.on('window-all-closed', () => {})

  // Check for updates (silently, no errors if offline)
  autoUpdater.logger = null
  autoUpdater.checkForUpdatesAndNotify().catch(() => {})

  // Global key listener for push-to-talk
  try {
    setupKeyListener({
      onRecordStart: () => mainWindow?.webContents.send('recording:start'),
      onRecordStop: () => mainWindow?.webContents.send('recording:stop'),
      onRecordCancel: () => mainWindow?.webContents.send('recording:cancel'),
      onToggleUI: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide()
        } else {
          showWindowOnCurrentScreen()
        }
      },
    })
  } catch (err) {
    console.error('Key listener setup failed:', err)
    mainWindow?.webContents.on('did-finish-load', () => {
      mainWindow?.show()
      ensureDockHidden()
    })
  }

  // macOS: hide window when user switches Spaces (virtual desktops)
  if (PLATFORM.IS_MAC) {
    systemPreferences.subscribeWorkspaceNotification(
      'NSWorkspaceActiveSpaceDidChangeNotification',
      () => {
        // Skip if we're intentionally showing the window (the workspace
        // trick triggers this notification as a side effect)
        if (isShowingWindow) return
        if (mainWindow?.isVisible()) {
          mainWindow.hide()
        }
      },
    )
  }

  // Pin window to current Space only (don't follow across Spaces)
  mainWindow.setVisibleOnAllWorkspaces(false)

  // === IPC Handlers ===

  ipcMain.handle(
    'transcribe',
    async (_, audioBase64: string, mimeType: string) => {
      const mode = store.get('mode')
      const text = await transcribeAudio(audioBase64, mimeType, mode)
      addToHistory(text, mode)
      const pasted = await pasteText(text)
      return { text, pasted }
    },
  )

  ipcMain.handle('paste-text', (_, text: string) => pasteText(text))

  ipcMain.handle('store:get', (_, key: string) => store.get(key as any))

  ipcMain.handle('store:set', (_, key: string, value: any) =>
    store.set(key as any, value),
  )

  ipcMain.handle('store:get-all', () => ({
    apiKey: store.get('apiKey'),
    mode: store.get('mode'),
    deviceId: store.get('deviceId'),
    history: store.get('history'),
  }))

  ipcMain.handle('store:delete-history-entry', (_, id: string) => {
    removeFromHistory(id)
  })

  ipcMain.handle('window:resize', (_, height: number) => {
    if (!mainWindow) return
    const [width] = mainWindow.getSize()
    mainWindow.setSize(width, Math.min(Math.max(Math.ceil(height), 48), 500))
  })

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('window:hide', () => mainWindow?.hide())

  ipcMain.handle('window:show', () => showWindowOnCurrentScreen())
})
