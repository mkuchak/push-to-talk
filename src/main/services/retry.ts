interface RetryOptions {
  attempts: number
  /** Delay before attempt N+2 (index 0 = delay before attempt 2). */
  backoffMs: number[]
  /** Fractional jitter applied to each backoff delay (e.g. 0.2 = ±20%). */
  jitter: number
  /** Upper bound for a Retry-After header value. */
  retryAfterCapMs: number
  isRetryable: (err: unknown) => boolean
  onAttempt?: (attempt: number) => void
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
])
const RETRYABLE_MESSAGE = /overloaded|unavailable|try again|fetch failed/i

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    status?: number
    code?: string
    message?: string
    cause?: { code?: string }
  }

  if (typeof e.status === 'number' && RETRYABLE_STATUS.has(e.status)) return true

  const code = e.code ?? e.cause?.code
  if (code && RETRYABLE_CODES.has(code)) return true

  if (typeof e.message === 'string' && RETRYABLE_MESSAGE.test(e.message)) {
    return true
  }

  return false
}

function parseRetryAfter(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null
  const e = err as {
    retryAfter?: string | number
    headers?: { get?: (k: string) => string | null }
  }

  if (typeof e.retryAfter === 'number') return e.retryAfter * 1000
  if (typeof e.retryAfter === 'string') {
    const n = Number(e.retryAfter)
    if (!Number.isNaN(n)) return n * 1000
  }

  const header = e.headers?.get?.('Retry-After') ?? null
  if (header) {
    const n = Number(header)
    if (!Number.isNaN(n)) return n * 1000
  }

  return null
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<{ value: T; attemptsMade: number }> {
  const { attempts, backoffMs, jitter, retryAfterCapMs, isRetryable, onAttempt } = opts

  let lastError: unknown
  let attemptsMade = 0

  for (let i = 0; i < attempts; i++) {
    attemptsMade = i + 1
    onAttempt?.(attemptsMade)

    try {
      const value = await fn()
      return { value, attemptsMade }
    } catch (err) {
      lastError = err

      const isLastAttempt = i === attempts - 1
      if (isLastAttempt || !isRetryable(err)) break

      const base = backoffMs[i] ?? backoffMs[backoffMs.length - 1] ?? 0
      const retryAfter = parseRetryAfter(err)
      const delay =
        retryAfter !== null
          ? Math.min(retryAfter, retryAfterCapMs)
          : base * (1 + (Math.random() * 2 - 1) * jitter)

      await sleep(Math.max(0, delay))
    }
  }

  const err = lastError as Error & { attemptsMade?: number }
  if (err && typeof err === 'object') err.attemptsMade = attemptsMade
  throw err
}
