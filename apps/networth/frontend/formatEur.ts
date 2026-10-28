const FULL = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const COMPACT = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
})
const AMOUNT_INPUT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEur(cents: number): string {
  return FULL.format(cents / 100)
}

export function formatEurCompact(cents: number): string {
  return COMPACT.format(cents / 100)
}

export function formatAmountInput(cents: number): string {
  return AMOUNT_INPUT.format(cents / 100)
}

export function formatQuantityInput(quantity: number): string {
  return String(quantity).replace('.', ',')
}
