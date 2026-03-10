import { GoogleGenerativeAI } from '@google/generative-ai'

import { LANGUAGES } from 'shared/languages'

import { store } from './store'

function buildPrompt(from: string, to: string): string {
  const fromLang = LANGUAGES[from]
  const toLang = LANGUAGES[to]
  const fromShort = fromLang.split(' ').pop()!
  const toShort = toLang.split(' ').pop()!

  if (from === to) {
    return `You are a precise transcription assistant. Transcribe the following audio faithfully in ${fromLang} (${from}). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.`
  }

  return `You are a precise translation assistant. The following audio is spoken in ${fromLang} (${from}). You MUST translate it into ${toLang} (${to}). Even if parts of the audio sound like ${toShort}, treat the entire input as ${fromShort} and translate everything to ${toShort}. Produce a faithful, natural-sounding translation that preserves the speaker's meaning, tone, and intent. Fix any obvious errors. Output ONLY the translated text in ${toShort} — no quotes, no labels, no explanation, no original ${fromShort} text.`
}

function getPrompt(mode: string): string {
  const [from, to] = mode.split('>')
  if (LANGUAGES[from] && LANGUAGES[to]) return buildPrompt(from, to)
  return buildPrompt('en-US', 'en-US')
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

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

  const result = await model.generateContent([
    getPrompt(mode),
    {
      inlineData: {
        data: audioBase64,
        mimeType,
      },
    },
  ])

  return result.response.text().trim()
}
