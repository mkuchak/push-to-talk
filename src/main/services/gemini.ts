import { GoogleGenerativeAI } from '@google/generative-ai'

import { store } from './store'

const PROMPTS: Record<string, string> = {
  'pt>pt':
    "You are a precise transcription assistant. Transcribe the following audio faithfully in Brazilian Portuguese (pt-BR). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.",

  'pt>en':
    "You are a precise translation assistant. The following audio is spoken in Brazilian Portuguese (pt-BR). Produce a faithful, natural-sounding translation in American English (en-US). Preserve the speaker's meaning, tone, and intent. Fix any obvious errors. Output only the translated text, nothing else — no quotes, no labels, no explanation.",

  'en>en':
    "You are a precise transcription assistant. Transcribe the following audio faithfully in American English (en-US). Fix any obvious spelling or grammatical errors while preserving the speaker's original meaning, tone, and style. Do not add, remove, or rephrase content beyond error corrections. Output only the corrected transcription, nothing else — no quotes, no labels, no explanation.",

  'en>pt':
    "You are a precise translation assistant. The following audio is spoken in American English (en-US). Produce a faithful, natural-sounding translation in Brazilian Portuguese (pt-BR). Preserve the speaker's meaning, tone, and intent. Fix any obvious errors. Output only the translated text, nothing else — no quotes, no labels, no explanation.",
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
