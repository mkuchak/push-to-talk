import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { downloadFile } from '../../src/main/services/whisper/download'

const payload = randomBytes(256 * 1024)
const sha256 = createHash('sha256').update(payload).digest('hex')

let server: Server
let baseUrl = ''
let honorRange = true
let requests: Array<string | undefined> = []
let dir = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push(req.headers.range)
    const match = /^bytes=(\d+)-$/.exec(req.headers.range ?? '')
    if (honorRange && match) {
      const start = Number(match[1])
      if (start >= payload.length) {
        res.writeHead(416).end()
        return
      }
      res.writeHead(206, {
        'Content-Length': payload.length - start,
        'Content-Range': `bytes ${start}-${payload.length - 1}/${payload.length}`,
      })
      res.end(payload.subarray(start))
      return
    }
    res.writeHead(200, { 'Content-Length': payload.length })
    res.end(payload)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (address && typeof address === 'object') baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  honorRange = true
  requests = []
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = mkdtempSync(join(tmpdir(), 'ptt-download-'))
})

describe('downloadFile', () => {
  it('downloads, verifies and renames into place', async () => {
    const dest = join(dir, 'nested', 'model.bin')
    const progress: number[] = []
    await downloadFile({
      url: `${baseUrl}/model.bin`,
      dest,
      sha256,
      fetch,
      onProgress: (received) => progress.push(received),
    })

    expect(readFileSync(dest).equals(payload)).toBe(true)
    expect(existsSync(`${dest}.part`)).toBe(false)
    expect(progress.at(-1)).toBe(payload.length)
  })

  it('resumes a partial download with a Range request', async () => {
    const dest = join(dir, 'model.bin')
    writeFileSync(`${dest}.part`, payload.subarray(0, 100_000))

    await downloadFile({ url: `${baseUrl}/model.bin`, dest, sha256, fetch })

    expect(requests).toEqual(['bytes=100000-'])
    expect(readFileSync(dest).equals(payload)).toBe(true)
  })

  it('starts over when the server ignores the Range header', async () => {
    honorRange = false
    const dest = join(dir, 'model.bin')
    writeFileSync(`${dest}.part`, Buffer.from('garbage that must be discarded'))

    await downloadFile({ url: `${baseUrl}/model.bin`, dest, sha256, fetch })

    expect(readFileSync(dest).equals(payload)).toBe(true)
  })

  it('restarts when the partial file is already complete (416)', async () => {
    const dest = join(dir, 'model.bin')
    writeFileSync(`${dest}.part`, payload)

    await downloadFile({ url: `${baseUrl}/model.bin`, dest, sha256, fetch })

    expect(requests).toEqual([`bytes=${payload.length}-`, undefined])
    expect(readFileSync(dest).equals(payload)).toBe(true)
  })

  it('rejects a checksum mismatch and leaves nothing behind', async () => {
    const dest = join(dir, 'model.bin')
    await expect(
      downloadFile({ url: `${baseUrl}/model.bin`, dest, sha256: '0'.repeat(64), fetch }),
    ).rejects.toThrow(/Checksum mismatch/)

    expect(existsSync(dest)).toBe(false)
    expect(existsSync(`${dest}.part`)).toBe(false)
  })

  it('keeps the partial file when aborted', async () => {
    const dest = join(dir, 'model.bin')
    const controller = new AbortController()
    await expect(
      downloadFile({
        url: `${baseUrl}/model.bin`,
        dest,
        sha256,
        fetch,
        signal: controller.signal,
        onProgress: (received) => {
          if (received > 0) controller.abort()
        },
      }),
    ).rejects.toThrow()

    expect(existsSync(dest)).toBe(false)
    expect(existsSync(`${dest}.part`)).toBe(true)
  })
})
