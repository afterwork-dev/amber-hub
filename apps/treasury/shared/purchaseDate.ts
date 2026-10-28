const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidPurchaseDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false

  // Round-tripping catches dates the calendar does not have: Date rolls 2024-02-30 over to March.
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false

  return value <= new Date().toISOString().slice(0, 10)
}
