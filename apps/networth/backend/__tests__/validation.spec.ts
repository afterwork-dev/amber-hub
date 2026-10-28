import { describe, it, expect } from 'vitest'
import {
  centsFromEuros,
  InvalidRecordError,
  requireAmountCents,
  requireCategory,
  requireKnownFieldsOnly,
  requireMonth,
  requireQuantity,
  requireText,
} from '../validation'

describe('requireText', () => {
  it('returns the trimmed value', () => {
    expect(requireText('  Main Account  ', 'name', 200)).toBe('Main Account')
  })

  it('rejects non-strings, blank strings and over-long strings', () => {
    expect(() => requireText(42, 'name', 200)).toThrow(InvalidRecordError)
    expect(() => requireText('   ', 'name', 200)).toThrow(/must not be empty/)
    expect(() => requireText('x'.repeat(201), 'name', 200)).toThrow(/at most 200/)
  })
})

describe('requireMonth', () => {
  it('returns a valid past month', () => {
    expect(requireMonth('2024-02')).toBe('2024-02')
  })

  it('rejects malformed, missing and future months', () => {
    expect(() => requireMonth('2024-2')).toThrow(/YYYY-MM/)
    expect(() => requireMonth(undefined)).toThrow(/YYYY-MM/)
    expect(() => requireMonth('2999-01')).toThrow(/YYYY-MM/)
  })
})

describe('requireCategory', () => {
  it('returns a fixed category', () => {
    expect(requireCategory('real-estate')).toBe('real-estate')
  })

  it('rejects an unknown category', () => {
    expect(() => requireCategory('crypto')).toThrow(/fixed categories/)
  })
})

describe('requireAmountCents', () => {
  it('accepts negative, zero and positive whole cents', () => {
    expect(requireAmountCents(-12900825)).toBe(-12900825)
    expect(requireAmountCents(0)).toBe(0)
    expect(requireAmountCents(50000)).toBe(50000)
  })

  it('rejects fractions and non-numbers', () => {
    expect(() => requireAmountCents(1.5)).toThrow(/whole number of cents/)
    expect(() => requireAmountCents('100')).toThrow(/whole number of cents/)
  })
})

describe('requireQuantity', () => {
  it('accepts a positive quantity', () => {
    expect(requireQuantity(3)).toBe(3)
  })

  it('rejects zero and non-numbers', () => {
    expect(() => requireQuantity(0)).toThrow(/greater than zero/)
    expect(() => requireQuantity('3')).toThrow(/greater than zero/)
  })
})

describe('requireKnownFieldsOnly', () => {
  it('returns the object when every field is allowed', () => {
    expect(requireKnownFieldsOnly({ entries: [] }, ['entries'])).toEqual({ entries: [] })
  })

  it('rejects non-objects and unknown fields', () => {
    expect(() => requireKnownFieldsOnly(null, ['entries'])).toThrow(/must be an object/)
    expect(() => requireKnownFieldsOnly([], ['entries'])).toThrow(/must be an object/)
    expect(() => requireKnownFieldsOnly({ userId: 'x' }, ['entries'])).toThrow(
      /unknown field userId/,
    )
  })
})

describe('centsFromEuros', () => {
  it('turns euros into whole cents, keeping the sign', () => {
    expect(centsFromEuros(1234.56)).toBe(123456)
    expect(centsFromEuros(-129008.25)).toBe(-12900825)
    expect(centsFromEuros(0.1 + 0.2)).toBe(30)
  })

  it('rejects fractions of a cent and non-numbers', () => {
    expect(() => centsFromEuros(1.234)).toThrow(/two decimals/)
    expect(() => centsFromEuros('12')).toThrow(/number of euros/)
    expect(() => centsFromEuros(Number.NaN)).toThrow(/number of euros/)
  })
})
