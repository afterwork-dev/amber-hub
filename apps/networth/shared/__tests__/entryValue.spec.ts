import { describe, it, expect } from 'vitest'
import { entryValueCents, isValidAmountCents, isValidQuantity } from '../entryValue'

describe('entryValueCents', () => {
  it('multiplies the amount by the quantity', () => {
    expect(entryValueCents({ amountCents: 50000, quantity: 3 })).toBe(150000)
  })

  it('keeps liabilities negative', () => {
    expect(entryValueCents({ amountCents: -129_008_25, quantity: 1 })).toBe(-129_008_25)
  })

  it('rounds fractional cents half away from zero', () => {
    expect(entryValueCents({ amountCents: 101, quantity: 0.5 })).toBe(51)
    expect(entryValueCents({ amountCents: -101, quantity: 0.5 })).toBe(-51)
  })
})

describe('isValidAmountCents', () => {
  it('accepts whole cents of either sign, and zero', () => {
    expect(isValidAmountCents(123456)).toBe(true)
    expect(isValidAmountCents(-123456)).toBe(true)
    expect(isValidAmountCents(0)).toBe(true)
  })

  it('rejects fractions and amounts beyond the limit', () => {
    expect(isValidAmountCents(1.5)).toBe(false)
    expect(isValidAmountCents(10_000_000_001)).toBe(false)
    expect(isValidAmountCents(Number.NaN)).toBe(false)
  })
})

describe('isValidQuantity', () => {
  it('accepts positive quantities with up to four decimals', () => {
    expect(isValidQuantity(1)).toBe(true)
    expect(isValidQuantity(0.0001)).toBe(true)
    expect(isValidQuantity(2.5)).toBe(true)
    expect(isValidQuantity(100_000)).toBe(true)
  })

  it('rejects zero, negatives, excess decimals and huge quantities', () => {
    expect(isValidQuantity(0)).toBe(false)
    expect(isValidQuantity(-1)).toBe(false)
    expect(isValidQuantity(0.00001)).toBe(false)
    expect(isValidQuantity(100_001)).toBe(false)
    expect(isValidQuantity(Number.POSITIVE_INFINITY)).toBe(false)
  })
})
