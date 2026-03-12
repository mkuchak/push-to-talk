import { clipboard, nativeImage } from 'electron'
import { exec } from 'node:child_process'

const RESTORE_DELAY = 300

interface ClipboardSnapshot {
  text: string | null
  html: string | null
  rtf: string | null
  image: Buffer | null
}

function saveClipboard(): ClipboardSnapshot {
  const formats = clipboard.availableFormats()
  return {
    text: formats.some((f) => f.includes('text/plain'))
      ? clipboard.readText()
      : null,
    html: formats.some((f) => f.includes('text/html'))
      ? clipboard.readHTML()
      : null,
    rtf: formats.some((f) => f.includes('text/rtf'))
      ? clipboard.readRTF()
      : null,
    image: formats.some((f) => f.includes('image/'))
      ? (() => {
          const img = clipboard.readImage()
          return img.isEmpty() ? null : img.toPNG()
        })()
      : null,
  }
}

function restoreClipboard(snapshot: ClipboardSnapshot) {
  const data: Record<string, unknown> = {}
  if (snapshot.text) data.text = snapshot.text
  if (snapshot.html) data.html = snapshot.html
  if (snapshot.rtf) data.rtf = snapshot.rtf
  if (snapshot.image)
    data.image = nativeImage.createFromBuffer(snapshot.image)

  if (Object.keys(data).length > 0) {
    clipboard.write(data)
  } else {
    clipboard.clear()
  }
}

function simulatePaste(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec(
        'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
        (error) => resolve(!error),
      )
    } else if (process.platform === 'win32') {
      exec(
        'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"',
        (error) => resolve(!error),
      )
    } else {
      exec('xdotool key ctrl+v', (error) => resolve(!error))
    }
  })
}

export async function pasteText(text: string): Promise<boolean> {
  const snapshot = saveClipboard()

  clipboard.writeText(text)
  const pasted = await simulatePaste()

  if (pasted) {
    // Restore after delay so the target app has time to consume the paste
    setTimeout(() => restoreClipboard(snapshot), RESTORE_DELAY)
  }
  // If paste failed, leave text on clipboard as fallback for manual Cmd+V

  return pasted
}
