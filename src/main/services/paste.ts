import { clipboard } from 'electron'
import { exec } from 'node:child_process'

function simulatePaste(): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec(
        'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
        () => resolve(),
      )
    } else if (process.platform === 'win32') {
      exec(
        'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"',
        () => resolve(),
      )
    } else {
      exec('xdotool key ctrl+v', () => resolve())
    }
  })
}

export async function pasteText(text: string): Promise<boolean> {
  clipboard.writeText(text)
  await simulatePaste()

  // Text stays on clipboard — if paste worked, it's already in the target app.
  // If paste failed, user can manually Cmd+V / Ctrl+V.
  return true
}
