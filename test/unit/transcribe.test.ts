import { describe, it, expect, vi, beforeEach } from 'vitest'

const { settings, gemini, whisper } = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  gemini: { transcribeAudio: vi.fn(), polishTranscript: vi.fn() },
  whisper: { isWhisperReady: vi.fn(), transcribeWithWhisper: vi.fn() },
}))

vi.mock('../../src/main/services/store', () => ({
  store: { get: (key: string) => settings[key] },
}))
vi.mock('../../src/main/services/gemini', () => gemini)
vi.mock('../../src/main/services/whisper', () => whisper)

import { transcribe } from '../../src/main/services/transcribe'

const wav = new Uint8Array(44)
const base = { audioBase64: 'd2VibQ==', mimeType: 'audio/webm;codecs=opus' }

beforeEach(() => {
  vi.resetAllMocks()
  Object.assign(settings, { apiKey: 'key', context: 'Supabase', whisperPolish: false })
  whisper.isWhisperReady.mockReturnValue(true)
  whisper.transcribeWithWhisper.mockResolvedValue('Eu tenho 5 maçãs.')
  gemini.transcribeAudio.mockResolvedValue('from gemini')
  gemini.polishTranscript.mockResolvedValue('polished')
})

describe('transcribe routing', () => {
  it('sends same-language modes to local Whisper', async () => {
    const result = await transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })

    expect(result).toEqual({ text: 'Eu tenho 5 maçãs.', engine: 'whisper' })
    expect(whisper.transcribeWithWhisper).toHaveBeenCalledWith(wav, 'pt-BR', 'Supabase')
    expect(gemini.transcribeAudio).not.toHaveBeenCalled()
  })

  it('keeps translations on Gemini', async () => {
    const result = await transcribe({ ...base, wav, mode: 'pt-BR>en-US' })

    expect(result).toEqual({ text: 'from gemini', engine: 'gemini' })
    expect(whisper.transcribeWithWhisper).not.toHaveBeenCalled()
  })

  it('uses Gemini when Whisper is disabled or not installed', async () => {
    whisper.isWhisperReady.mockReturnValue(false)
    const result = await transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })
    expect(result.engine).toBe('gemini')
  })

  it('uses Gemini when the renderer sent no WAV', async () => {
    const result = await transcribe({ ...base, mode: 'pt-BR>pt-BR' })
    expect(result.engine).toBe('gemini')
  })

  it('falls back to Gemini when local Whisper fails', async () => {
    whisper.transcribeWithWhisper.mockRejectedValue(new Error('whisper-server crashed'))
    const result = await transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })

    expect(result).toEqual({ text: 'from gemini', engine: 'gemini' })
    expect(gemini.transcribeAudio).toHaveBeenCalledWith(base.audioBase64, base.mimeType, 'pt-BR>pt-BR')
  })

  it('surfaces the local error when there is no Gemini key to fall back to', async () => {
    settings.apiKey = ''
    whisper.transcribeWithWhisper.mockRejectedValue(new Error('whisper-server crashed'))

    await expect(transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })).rejects.toThrow('whisper-server crashed')
    expect(gemini.transcribeAudio).not.toHaveBeenCalled()
  })

  it('reports silence instead of sending it to Gemini', async () => {
    whisper.transcribeWithWhisper.mockResolvedValue('')

    await expect(transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })).rejects.toThrow('No speech detected')
    expect(gemini.transcribeAudio).not.toHaveBeenCalled()
  })

  it('polishes the local transcript with Gemini when enabled', async () => {
    settings.whisperPolish = true
    const result = await transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })

    expect(result).toEqual({ text: 'polished', engine: 'whisper' })
    expect(gemini.polishTranscript).toHaveBeenCalledWith('Eu tenho 5 maçãs.', 'pt-BR')
  })

  it('keeps the raw transcript when polishing fails', async () => {
    settings.whisperPolish = true
    gemini.polishTranscript.mockRejectedValue(new Error('quota'))
    const result = await transcribe({ ...base, wav, mode: 'pt-BR>pt-BR' })

    expect(result).toEqual({ text: 'Eu tenho 5 maçãs.', engine: 'whisper' })
  })

  it('reports Gemini attempts with their maximum', async () => {
    const attempts: Array<[number, number]> = []
    await transcribe({
      ...base,
      mode: 'pt-BR>en-US',
      onAttempt: (attempt, max) => attempts.push([attempt, max]),
    })
    expect(attempts).toEqual([[1, 3]])
  })
})
