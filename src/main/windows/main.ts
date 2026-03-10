import { screen } from 'electron'
import { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'

export async function MainWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
  const windowWidth = 440
  const isMac = process.platform === 'darwin'

  const window = createWindow({
    id: 'main',
    title: 'Push to Talk',
    width: windowWidth,
    height: 72,
    show: false,
    frame: false,
    transparent: isMac,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    movable: true,
    autoHideMenuBar: true,
    x: Math.round((screenWidth - windowWidth) / 2),
    y: 80,
    backgroundColor: isMac ? undefined : '#1a1a1a',
    ...(isMac && {
      vibrancy: 'under-window' as const,
      visualEffectState: 'active' as const,
    }),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      backgroundThrottling: false,
    },
  })

  return window
}
