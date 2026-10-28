import { describe, it, expect } from 'vitest'
import { formatAmountInput, formatEur, formatEurCompact, formatQuantityInput } from '../formatEur'

const NBSP = ' '

describe('formatEur', () => {
  it('formats cents in the Hub’s EUR style', () => {
    expect(formatEur(123456)).toBe(`1.234,56${NBSP}€`)
    expect(formatEur(0)).toBe(`0,00${NBSP}€`)
  })

  it('keeps the sign on negative amounts', () => {
    expect(formatEur(-150)).toBe(`-1,50${NBSP}€`)
    expect(formatEur(-12900825)).toBe(`-129.008,25${NBSP}€`)
  })
})

describe('formatEurCompact', () => {
  it('abbreviates large amounts for chart labels', () => {
    expect(formatEurCompact(22082253)).toBe('€221K')
    expect(formatEurCompact(240000)).toBe('€2.4K')
    expect(formatEurCompact(-12900825)).toBe('-€129K')
  })
})

describe('formatAmountInput', () => {
  it('writes cents back in the form the amount field reads', () => {
    expect(formatAmountInput(123456)).toBe('1.234,56')
    expect(formatAmountInput(-50)).toBe('-0,50')
  })
})

describe('formatQuantityInput', () => {
  it('writes decimals with a comma', () => {
    expect(formatQuantityInput(2.5)).toBe('2,5')
    expect(formatQuantityInput(3)).toBe('3')
  })
})
