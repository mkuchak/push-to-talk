import { createHash, type Hash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, rename, stat, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'

interface DownloadOptions {
  url: string
  dest: string
  sha256: string
  /** Expected size in bytes, used when the server omits Content-Length */
  size?: number
  signal?: AbortSignal
  onProgress?: (received: number, total: number) => void
  /** Electron's net.fetch in the app; injectable for tests */
  fetch: (url: string, init?: RequestInit) => Promise<Response>
}

async function partSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size
  } catch {
    return 0
  }
}

async function hashExisting(path: string, hash: Hash): Promise<void> {
  for await (const chunk of createReadStream(path)) hash.update(chunk)
}

/**
 * Downloads `url` to `dest` through `<dest>.part`, resuming a previous partial
 * download with a Range request. The file only lands at `dest` once its
 * SHA-256 matches, so an existing `dest` is always complete and verified.
 * On abort the `.part` file is kept for the next attempt.
 */
export async function downloadFile(opts: DownloadOptions): Promise<void> {
  const { url, dest, sha256, signal, onProgress } = opts
  const part = `${dest}.part`
  await mkdir(dirname(dest), { recursive: true })

  let offset = await partSize(part)
  if (opts.size && offset > opts.size) {
    await unlink(part)
    offset = 0
  }

  let res = await opts.fetch(url, {
    headers: offset > 0 ? { Range: `bytes=${offset}-` } : undefined,
    signal,
  })

  // The partial file already covers the whole range (or is stale): start over
  if (res.status === 416) {
    await res.body?.cancel()
    await unlink(part).catch(() => {})
    offset = 0
    res = await opts.fetch(url, { signal })
  }

  if (!res.ok || !res.body) {
    throw new Error(`Download failed (HTTP ${res.status}) for ${url}`)
  }

  // Only append when the server honored our Range from the exact offset;
  // a plain 200 means it sent the whole file again.
  const resumed =
    offset > 0 &&
    res.status === 206 &&
    (res.headers.get('content-range') ?? '').startsWith(`bytes ${offset}-`)
  if (!resumed) offset = 0

  const hash = createHash('sha256')
  if (resumed) await hashExisting(part, hash)

  const length = Number(res.headers.get('content-length'))
  const total = length > 0 ? offset + length : (opts.size ?? 0)
  let received = offset
  onProgress?.(received, total)

  const file = await open(part, resumed ? 'a' : 'w')
  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      await file.write(chunk)
      hash.update(chunk)
      received += chunk.byteLength
      onProgress?.(received, total)
    }
    await file.sync()
  } finally {
    await file.close()
  }

  const actual = hash.digest('hex')
  if (actual !== sha256.toLowerCase()) {
    await unlink(part).catch(() => {})
    throw new Error(`Checksum mismatch for ${url}`)
  }

  await rename(part, dest)
}
