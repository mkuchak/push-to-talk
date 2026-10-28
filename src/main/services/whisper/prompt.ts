// Whisper can't follow instructions: its prompt is treated as the text that
// came right before the audio, so it copies the prompt's style. Each example
// is written in the locale's own spelling, with punctuation, a question and
// numerals, to nudge the transcription the same way.
const STYLE_EXAMPLES: Record<string, string> = {
  'en-US': 'Hi! I have 3 meetings today, the first one at 10:30. Can you send me the report by 5 p.m.?',
  'pt-BR': 'Oi! Hoje tenho 3 reuniões, a primeira às 10h30. Você consegue me mandar o relatório até as 17h?',
  'es-CO': '¡Hola! Hoy tengo 3 reuniones, la primera a las 10:30. ¿Me puedes mandar el informe antes de las 5?',
  'es-ES': '¡Hola! Hoy tengo 3 reuniones, la primera a las 10:30. ¿Me puedes enviar el informe antes de las 5?',
  'fr-FR': "Salut ! Aujourd'hui j'ai 3 réunions, la première à 10 h 30. Tu peux m'envoyer le rapport avant 17 h ?",
  'de-DE': 'Hallo! Heute habe ich 3 Meetings, das erste um 10:30 Uhr. Kannst du mir den Bericht bis 17 Uhr schicken?',
  'hi-IN': 'नमस्ते! आज मेरी 3 मीटिंग हैं, पहली 10:30 बजे है। क्या आप मुझे शाम 5 बजे तक रिपोर्ट भेज सकते हैं?',
}

// Whisper's prompt window is ~224 tokens and it keeps the *end* of the
// prompt, so the context goes first and gets capped, and the style example
// sits right before the audio.
const MAX_CONTEXT_CHARS = 300

// Subtitle credits Whisper invents on noise (from its training data). Only
// dropped when they are the entire output. Short words it also invents on
// silence ("Obrigado.", "you") stay out of this list since people do dictate
// them; VAD is what keeps silence away from the model.
const HALLUCINATIONS = new Set([
  'thanks for watching',
  'thank you for watching',
  'subtitles by the amaraorg community',
  'legendas pela comunidade amaraorg',
  'gracias por ver',
  'subtítulos realizados por la comunidad de amaraorg',
  'soustitres réalisés par la communauté damaraorg',
  'untertitel der amaraorg community',
  'untertitelung des zdf 2020',
])

/** Whisper's language code: it has no regional variants (pt-BR → pt). */
export function whisperLanguage(locale: string): string {
  return locale.split('-')[0].toLowerCase()
}

export function buildWhisperPrompt(locale: string, context: string): string {
  const style = STYLE_EXAMPLES[locale] ?? STYLE_EXAMPLES['en-US']
  let terms = context.replace(/\s+/g, ' ').trim()
  if (terms.length > MAX_CONTEXT_CHARS) {
    const cut = terms.slice(0, MAX_CONTEXT_CHARS)
    terms = cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : undefined)
  }
  return terms ? `${terms}\n${style}` : style
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Joins whisper-server's per-segment lines and drops known hallucinations. */
export function cleanWhisperText(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text || HALLUCINATIONS.has(normalize(text))) return ''
  return text
}
