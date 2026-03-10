import { GoogleGenerativeAI } from '@google/generative-ai'

import { store } from './store'

const PROMPTS: Record<string, string> = {
  'pt>pt':
    "You are a precise transcription assistant. Transcribe the following audio faithfully in Brazilian Portuguese (pt-BR). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.",

  'pt>en':
    "You are a precise translation assistant. The following audio is spoken in Brazilian Portuguese (pt-BR). You MUST translate it into American English (en-US). Even if parts of the audio sound like English, treat the entire input as Portuguese and translate everything to English. Produce a faithful, natural-sounding translation that preserves the speaker's meaning, tone, and intent. Fix any obvious errors. Output ONLY the translated text in English — no quotes, no labels, no explanation, no original Portuguese text.",

  'en>en':
    "You are a precise transcription assistant. Transcribe the following audio faithfully in American English (en-US). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.",

  'en>pt':
    "You are a precise translation assistant. The following audio is spoken in American English (en-US). You MUST translate it into Brazilian Portuguese (pt-BR). Even if parts of the audio sound like Portuguese, treat the entire input as English and translate everything to Portuguese. Produce a faithful, natural-sounding translation that preserves the speaker's meaning, tone, and intent. Fix any obvious errors. Output ONLY the translated text in Portuguese — no quotes, no labels, no explanation, no original English text.",
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

  const prompt = PROMPTS[mode] || PROMPTS['en>en']

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: audioBase64,
        mimeType,
      },
    },
  ])

  return result.response.text().trim()
}
