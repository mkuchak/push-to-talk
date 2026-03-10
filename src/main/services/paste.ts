import { clipboard } from 'electron'
import { exec } from 'node:child_process'

export function pasteText(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    clipboard.writeText(text)

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
