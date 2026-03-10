import { Tray, Menu, nativeImage, app } from 'electron'
import { deflateSync } from 'node:zlib'

// Distance from point to a line segment (for anti-aliased strokes)
function distToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Distance from a point to an arc (center cx,cy, radius r, from angle a0 to a1)
function distToArc(
  px: number, py: number,
  cx: number, cy: number,
  r: number, a0: number, a1: number,
): number {
  const angle = Math.atan2(py - cy, px - cx)
  const norm = ((angle - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  const range = ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)

  if (norm <= range) {
    return Math.abs(Math.hypot(px - cx, py - cy) - r)
  }
  const d0 = Math.hypot(px - (cx + r * Math.cos(a0)), py - (cy + r * Math.sin(a0)))
  const d1 = Math.hypot(px - (cx + r * Math.cos(a1)), py - (cy + r * Math.sin(a1)))
  return Math.min(d0, d1)
}

// Distance from a point to a filled rounded rect (capsule)
function distToRoundedRect(
  px: number, py: number,
  x: number, y: number,
  w: number, h: number,
  r: number,
): number {
  // Clamp to inner rect
  const cx = Math.max(x + r, Math.min(x + w - r, px))
  const cy = Math.max(y + r, Math.min(y + h - r, py))
  const d = Math.hypot(px - cx, py - cy)
  return d - r
}

function createMicIconPNG(size: number): Buffer {
  const s = size / 22 // scale factor (design is 22x22 units)
  const pixels = Buffer.alloc(size * (1 + size * 4))

  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4)
    pixels[row] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / s
      const py = (y + 0.5) / s

      let alpha = 0

      // 1. Mic capsule (filled rounded rect / capsule)
      const capsuleDist = distToRoundedRect(px, py, 7.5, 3, 7, 11, 3.5)
      if (capsuleDist < 0.5) {
        alpha = Math.max(alpha, capsuleDist < -0.5 ? 1 : 0.5 - capsuleDist)
      }

      // 2. U-shaped holder (arc stroke)
      const holderR = 6
      const holderCx = 11
      const holderCy = 11.5
      const strokeW = 0.9
      const arcDist = distToArc(px, py, holderCx, holderCy, holderR, 0, Math.PI)
      const holderAlpha = Math.max(0, 1 - Math.max(0, Math.abs(arcDist) - strokeW) / 0.5)

      // Left arm of holder
      const leftArmDist = distToSegment(px, py, 5, 8.5, 5, 11.5)
      const leftArmAlpha = Math.max(0, 1 - Math.max(0, leftArmDist - strokeW) / 0.5)

      // Right arm of holder
      const rightArmDist = distToSegment(px, py, 17, 8.5, 17, 11.5)
      const rightArmAlpha = Math.max(0, 1 - Math.max(0, rightArmDist - strokeW) / 0.5)

      alpha = Math.max(alpha, holderAlpha, leftArmAlpha, rightArmAlpha)

      // 3. Stand (vertical line)
      const standDist = distToSegment(px, py, 11, 17.5, 11, 19)
      const standAlpha = Math.max(0, 1 - Math.max(0, standDist - strokeW) / 0.5)
      alpha = Math.max(alpha, standAlpha)

      // 4. Base (horizontal line)
      const baseDist = distToSegment(px, py, 8, 19, 14, 19)
      const baseAlpha = Math.max(0, 1 - Math.max(0, baseDist - strokeW) / 0.5)
      alpha = Math.max(alpha, baseAlpha)

      const i = row + 1 + x * 4
      pixels[i] = 0     // R
      pixels[i + 1] = 0 // G
      pixels[i + 2] = 0 // B
      pixels[i + 3] = Math.round(Math.min(1, alpha) * 255) // A
    }
  }

  // PNG encode
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(pixels)), pngChunk('IEND', Buffer.alloc(0))])
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeB = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([len, typeB, data, crcBuf])
}

export function setupTray(callbacks: {
  onToggleWindow: () => void
  onQuit: () => void
}): Tray {
  const icon16 = createMicIconPNG(16)
  const icon32 = createMicIconPNG(32)
  const icon44 = createMicIconPNG(44)

  const image = nativeImage.createFromBuffer(icon16)
  image.addRepresentation({ width: 32, height: 32, buffer: icon32, scaleFactor: 2 })
  image.addRepresentation({ width: 44, height: 44, buffer: icon44, scaleFactor: 2.75 })
  image.setTemplateImage(true)

  const tray = new Tray(image)
  tray.setToolTip('Push to Talk')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show / Hide', click: callbacks.onToggleWindow },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        callbacks.onQuit()
        app.quit()
      },
    },
  ])

  tray.on('click', callbacks.onToggleWindow)
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu))

  return tray
}
