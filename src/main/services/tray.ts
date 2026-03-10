import { Tray, Menu, nativeImage, app } from 'electron'
import { deflateSync } from 'node:zlib'

// 16x16 microphone template icon (# = filled, . = transparent)
// Designed as a macOS-style monochrome template image
const MIC_16 = [
  '................',
  '......####......',
  '.....######.....',
  '.....######.....',
  '.....######.....',
  '.....######.....',
  '.....######.....',
  '......####......',
  '..#...####...#..',
  '...#..####..#...',
  '....#.####.#....',
  '.....######.....',
  '.......##.......',
  '.......##.......',
  '.....######.....',
  '................',
]

function scaleUp2x(pixels: string[]): string[] {
  return pixels.flatMap((row) => {
    const doubled = row
      .split('')
      .map((c) => c + c)
      .join('')
    return [doubled, doubled]
  })
}

// CRC32 for PNG chunk checksums
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
    }
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

function createIconPNG(pixelMap: string[]): Buffer {
  const h = pixelMap.length
  const w = pixelMap[0].length

  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // Image data: filter byte (0) + RGBA per pixel, per row
  const raw = Buffer.alloc(h * (1 + w * 4))
  for (let y = 0; y < h; y++) {
    const offset = y * (1 + w * 4)
    raw[offset] = 0 // filter: none
    for (let x = 0; x < w; x++) {
      const px = offset + 1 + x * 4
      const filled = pixelMap[y][x] === '#'
      raw[px] = 0 // R
      raw[px + 1] = 0 // G
      raw[px + 2] = 0 // B
      raw[px + 3] = filled ? 255 : 0 // A
    }
  }

  const compressed = deflateSync(raw)

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

export function setupTray(callbacks: {
  onToggleWindow: () => void
  onQuit: () => void
}): Tray {
  // Create 16x16 icon and a 32x32 @2x version for retina
  const icon16 = createIconPNG(MIC_16)
  const icon32 = createIconPNG(scaleUp2x(MIC_16))

  const image = nativeImage.createFromBuffer(icon16)
  image.addRepresentation({
    width: 32,
    height: 32,
    buffer: icon32,
    scaleFactor: 2,
  })
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

  // Click to toggle window, right-click for context menu
  tray.on('click', callbacks.onToggleWindow)
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu))

  return tray
}
