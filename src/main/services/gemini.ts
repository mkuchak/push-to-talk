import { GoogleGenAI } from '@google/genai'

import { DEFAULT_GEMINI_MODEL } from 'shared/constants'
import { LANGUAGES } from 'shared/languages'

import { store } from './store'

function buildPrompt(from: string, to: string, context: string): string {
  const fromLang = LANGUAGES[from]
  const toLang = LANGUAGES[to]
  const fromShort = fromLang.split(' ').pop()!
  const toShort = toLang.split(' ').pop()!

  let prompt: string

  if (from === to) {
    prompt = `You are a precise transcription assistant. Transcribe the following audio faithfully in ${fromLang} (${from}). Attention to the output language, double attention(!): you must respect the selected language, both the language and the country of origin — ${fromLang} (${from}). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Pay close attention to the speaker's intonation to distinguish questions from statements, and punctuate accordingly. Always use numerals instead of words spelled out. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.`
  } else {
    prompt = `You are a precise translation assistant. The following audio is spoken in ${fromLang} (${from}). You MUST translate it into ${toLang} (${to}). Attention to the output language, double attention(!): you must respect the selected language, both the language and the country of origin — ${toLang} (${to}). Even if parts of the audio sound like ${toShort}, treat the entire input as ${fromShort} and translate everything to ${toShort}. Produce a faithful, natural-sounding translation that preserves the speaker's meaning, tone, and intent. Pay close attention to the speaker's intonation to distinguish questions from statements, and punctuate accordingly. Always use numerals instead of words spelled out. Fix any obvious errors. Output ONLY the translated text in ${toShort} — no quotes, no labels, no explanation, no original ${fromShort} text.`
  }

  return prompt + contextBlock(context)
}

function contextBlock(context: string): string {
  if (!context.trim()) return ''
  return `\n\nThe speaker may reference the following domain-specific terms, names, or context. Use this to improve transcription accuracy and ensure these terms are spelled correctly:\n"""\n${context.trim()}\n"""`
}

function getPrompt(mode: string, context: string): string {
  const [from, to] = mode.split('>')
  if (LANGUAGES[from] && LANGUAGES[to]) return buildPrompt(from, to, context)
  return buildPrompt('en-US', 'en-US', context)
}

function getClient() {
  const apiKey = store.get('apiKey')
  if (!apiKey) {
    throw new Error('API key not configured. Open settings to add your Gemini API key.')
  }
  const model = store.get('model').trim() || DEFAULT_GEMINI_MODEL
  return { ai: new GoogleGenAI({ apiKey }), model }
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  mode: string,
): Promise<string> {
  const { ai, model } = getClient()
  const context = store.get('context')

  // Google's officially supported audio MIMEs don't include audio/webm.
  // Relabel as audio/ogg (same Opus codec, different container claim) for
  // forward-compatibility with any future MIME tightening.
  const normalizedMime = mimeType.startsWith('audio/webm')
    ? 'audio/ogg;codecs=opus'
    : mimeType

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: getPrompt(mode, context) },
      { inlineData: { data: audioBase64, mimeType: normalizedMime } },
    ],
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned no text in response')
  }
  return text.trim()
}

/**
 * Text-only cleanup of a local Whisper transcript, bringing back what Whisper
 * can't do on its own: grammar fixes, numerals and the exact locale.
 */
export async function polishTranscript(text: string, locale: string): Promise<string> {
  const { ai, model } = getClient()
  const lang = LANGUAGES[locale] ?? LANGUAGES['en-US']
  const prompt = `You are a precise proofreading assistant. The text below is a raw speech-to-text transcript in ${lang} (${locale}). Attention to the output language, double attention(!): keep it in ${lang} (${locale}), respecting both the language and the country of origin, including regional spelling. Fix obvious spelling, grammatical, and punctuation errors, including question marks where the sentence is clearly a question. Always use numerals instead of words spelled out. Do not translate, summarize, add, remove, or rephrase content beyond these corrections. Output only the corrected text, nothing else — no quotes, no labels, no explanation.${contextBlock(store.get('context'))}`

  const response = await ai.models.generateContent({
    model,
    contents: [{ text: prompt }, { text: `Transcript:\n"""\n${text}\n"""` }],
  })

  return response.text?.trim() || text
}
