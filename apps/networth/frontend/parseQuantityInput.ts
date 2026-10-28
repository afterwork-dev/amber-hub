export function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return null

  return Number(trimmed.replace(',', '.'))
}
