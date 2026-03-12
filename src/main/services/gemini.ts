import { GoogleGenerativeAI } from '@google/generative-ai'

import { LANGUAGES } from 'shared/languages'

import { store } from './store'

function buildPrompt(from: string, to: string, context: string): string {
  const fromLang = LANGUAGES[from]
  const toLang = LANGUAGES[to]
  const fromShort = fromLang.split(' ').pop()!
  const toShort = toLang.split(' ').pop()!

  let prompt: string

  if (from === to) {
    prompt = `You are a precise transcription assistant. Transcribe the following audio faithfully in ${fromLang} (${from}). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.`
  } else {
    prompt = `You are a precise translation assistant. The following audio is spoken in ${fromLang} (${from}). You MUST translate it into ${toLang} (${to}). Even if parts of the audio sound like ${toShort}, treat the entire input as ${fromShort} and translate everything to ${toShort}. Produce a faithful, natural-sounding translation that preserves the speaker's meaning, tone, and intent. Fix any obvious errors. Output ONLY the translated text in ${toShort} — no quotes, no labels, no explanation, no original ${fromShort} text.`
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
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

  const result = await model.generateContent([
    getPrompt(mode, context),
    {
      inlineData: {
        data: audioBase64,
        mimeType,
      },
    },
  ])

  return result.response.text().trim()
}
