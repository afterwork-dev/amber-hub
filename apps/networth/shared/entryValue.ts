import { MAX_AMOUNT_CENTS, MAX_QUANTITY, MAX_QUANTITY_DECIMALS } from './entry-limits'

export function isValidAmountCents(value: number): boolean {
  return Number.isInteger(value) && Math.abs(value) <= MAX_AMOUNT_CENTS
}

export function isValidQuantity(value: number): boolean {
  const scaled = value * 10 ** MAX_QUANTITY_DECIMALS
  return (
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_QUANTITY &&
    Math.abs(scaled - Math.round(scaled)) < 1e-6
  )
}

export function entryValueCents(entry: { amountCents: number; quantity: number }): number {
  const value = entry.amountCents * entry.quantity
  return Math.sign(value) * Math.round(Math.abs(value))
}
