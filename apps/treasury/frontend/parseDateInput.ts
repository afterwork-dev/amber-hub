const EUROPEAN_DATE = /^(\d{1,2})-(\d{1,2})-(\d{4})$/

export function parseDateInput(raw: string): string | null {
  const match = EUROPEAN_DATE.exec(raw.trim())
  if (!match) return null

  const [, day = '', month = '', year = ''] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
