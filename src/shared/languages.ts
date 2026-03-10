export const LANGUAGES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese',
  'en-US': 'American English',
  'es-CO': 'Colombian Spanish',
}

function displayLabel(key: string): string {
  const langName = LANGUAGES[key].split(' ').pop()!
  const country = key.split('-')[1]
  return `${langName} (${country})`
}

const locales = Object.keys(LANGUAGES)

export const MODES = locales.flatMap((from) =>
  locales.map((to) => ({
    value: `${from}>${to}`,
    label: `${displayLabel(from)} → ${displayLabel(to)}`,
  })),
)
