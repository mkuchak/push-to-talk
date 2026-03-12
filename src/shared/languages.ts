export const LANGUAGES: Record<string, string> = {
  'en-US': 'American English',
  'pt-BR': 'Brazilian Portuguese',
  'es-CO': 'Colombian Spanish',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'hi-IN': 'Hindi',
}

export const DEFAULT_LANGUAGE = 'en-US'

export function displayLabel(key: string): string {
  const lang = LANGUAGES[key]
  if (!lang) return key
  const langName = lang.split(' ').pop()!
  const country = key.split('-')[1]
  return `${langName} (${country})`
}

export function generateModes(locales: string[]) {
  return locales.flatMap((from) =>
    locales.map((to) => ({
      value: `${from}>${to}`,
      label: `${displayLabel(from)} → ${displayLabel(to)}`,
    })),
  )
}

// All modes (used for history label lookup)
export const ALL_MODES = generateModes(Object.keys(LANGUAGES))
