export function formatEur(cents: number): string {
  const euros = Math.trunc(cents / 100).toLocaleString('de-DE')
  return `${euros},${String(cents % 100).padStart(2, '0')} €`
}

/** The stored value is a calendar date with no time; a Date would shift it for western timezones. */
export function formatPayoutDate(payoutDate: string): string {
  const [year, month, day] = payoutDate.split('-')
  return `${day}.${month}.${year}`
}

const COMPACT = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
})

/** For chart axis ticks only, where an exact amount would not fit. */
export function formatEurCompact(cents: number): string {
  return COMPACT.format(cents / 100)
}
