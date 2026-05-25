/**
 * End-to-end tests against the real Gemini API.
 *
 * Requires GEMINI_API_KEY in `.env.test` (auto-loaded by test/setup.ts).
 * Tests are skipped automatically if the key is missing.
 *
 * Cost per `pnpm test` run: ~2 API calls on gemini-3.1-flash-lite, well under
 * a cent. The audio fixture is `test/fixtures/audio/recording-pt-br.webm` — a
 * ~13-second Brazilian Portuguese clip whose content is documented in
 * `test/fixtures/audio/README.md`.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('../../src/main/services/store', () => ({
  store: {
    get: (key: string) => {
      if (key === 'apiKey') return process.env.GEMINI_API_KEY ?? ''
      if (key === 'context') return ''
      return undefined
    },
  },
}))

import { transcribeAudio } from '../../src/main/services/gemini'

const fixturePath = resolve(__dirname, '..', 'fixtures', 'audio', 'recording-pt-br.webm')
const audioBase64 = readFileSync(fixturePath).toString('base64')
const mimeType = 'audio/webm;codecs=opus'

const hasKey = !!process.env.GEMINI_API_KEY

async function transcribeWithRetry(mode: string): Promise<string> {
  try {
    return await transcribeAudio(audioBase64, mimeType, mode)
  } catch {
    return await transcribeAudio(audioBase64, mimeType, mode)
  }
}

describe.skipIf(!hasKey)('gemini E2E', () => {
  it(
    'transcribes pt-BR with numerals written as digits',
    async () => {
      const out = await transcribeWithRetry('pt-BR>pt-BR')
      console.error(`[transcription pt-BR] ${out}`)

      // Numerals rule
      expect(out).toMatch(/\b5\b/)
      expect(out).toMatch(/\b72\b/)
      expect(out).not.toMatch(/\bcinco\b/i)
      expect(out).not.toMatch(/setenta e duas/i)

      // Sanity: output is recognizably Portuguese
      expect(out).toMatch(/[çãõ]/i)
    },
    60_000,
  )

  it(
    'translates pt-BR → en-US with en-US lexical variants and numerals',
    async () => {
      const out = await transcribeWithRetry('pt-BR>en-US')
      console.error(`[translation pt-BR→en-US] ${out}`)

      // Numerals rule survives translation
      expect(out).toMatch(/\b5\b/)
      expect(out).toMatch(/\b72\b/)

      // en-US variant winners
      expect(out).toMatch(/favorite/i)
      expect(out).toMatch(/color/i)
      expect(out).toMatch(/neighborhood/i)

      // en-GB variants must be absent
      expect(out).not.toMatch(/favourite/i)
      expect(out).not.toMatch(/colour/i)
      expect(out).not.toMatch(/neighbourhood/i)

      // No Portuguese diacritics: ensures full translation, not partial
      expect(out).not.toMatch(/[çãõ]/)
    },
    60_000,
  )
})
