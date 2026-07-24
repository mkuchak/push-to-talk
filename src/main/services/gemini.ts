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

  if (context.trim()) {
    prompt += `\n\nThe speaker may reference the following domain-specific terms, names, or context. Use this to improve transcription accuracy and ensure these terms are spelled correctly:\n"""\n${context.trim()}\n"""`
  }

  return prompt
}

function getPrompt(mode: string, context: string): string {
  const [from, to] = mode.split('>')
  if (LANGUAGES[from] && LANGUAGES[to]) return buildPrompt(from, to, context)
  return buildPrompt('en-US', 'en-US', context)
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  mode: string,
): Promise<string> {
  const apiKey = store.get('apiKey')
  if (!apiKey) {
    throw new Error('API key not configured. Open settings to add your Gemini API key.')
  }

  const context = store.get('context')
  const model = store.get('model').trim() || DEFAULT_GEMINI_MODEL
  const ai = new GoogleGenAI({ apiKey })

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
