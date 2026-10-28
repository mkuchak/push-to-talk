import { describe, it, expect } from 'vitest'

import {
  buildWhisperPrompt,
  cleanWhisperText,
  whisperLanguage,
} from '../../src/main/services/whisper/prompt'
import { LANGUAGES } from '../../src/shared/languages'

describe('whisperLanguage', () => {
  it('drops the region, since Whisper has no regional variants', () => {
    expect(whisperLanguage('pt-BR')).toBe('pt')
    expect(whisperLanguage('es-CO')).toBe('es')
    expect(whisperLanguage('hi-IN')).toBe('hi')
  })
})

describe('buildWhisperPrompt', () => {
  it('has a style example with numerals for every supported language', () => {
    for (const locale of Object.keys(LANGUAGES)) {
      const prompt = buildWhisperPrompt(locale, '')
      expect(prompt).toMatch(/\d/)
      expect(prompt).toMatch(/\?/)
      if (locale !== 'en-US') {
        expect(prompt).not.toBe(buildWhisperPrompt('en-US', ''))
      }
    }
  })

  it('puts context first so the style example sits right before the audio', () => {
    const prompt = buildWhisperPrompt('pt-BR', 'Supabase,  Kubernetes\n\nDrizzle')
    expect(prompt.startsWith('Supabase, Kubernetes Drizzle\n')).toBe(true)
    expect(prompt.endsWith(buildWhisperPrompt('pt-BR', ''))).toBe(true)
  })

  it('caps long context at a word boundary', () => {
    const context = 'term '.repeat(200)
    const [terms] = buildWhisperPrompt('en-US', context).split('\n')
    expect(terms.length).toBeLessThanOrEqual(300)
    expect(terms.endsWith('term')).toBe(true)
  })
})

describe('cleanWhisperText', () => {
  it('joins per-segment lines into one paragraph', () => {
    expect(cleanWhisperText(' Eu tenho 5 maçãs.\n Minha cor favorita é azul.\n')).toBe(
      'Eu tenho 5 maçãs. Minha cor favorita é azul.',
    )
  })

  it('drops subtitle-credit hallucinations', () => {
    expect(cleanWhisperText(' Legendas pela comunidade Amara.org')).toBe('')
    expect(cleanWhisperText('Thanks for watching!')).toBe('')
    expect(cleanWhisperText('   ')).toBe('')
  })

  it('keeps short phrases people really dictate', () => {
    expect(cleanWhisperText(' Obrigado.')).toBe('Obrigado.')
    expect(cleanWhisperText('Thank you')).toBe('Thank you')
  })
})
