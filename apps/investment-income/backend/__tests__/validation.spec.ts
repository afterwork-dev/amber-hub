import { describe, it, expect } from 'vitest'
import {
  centsFromEuros,
  InvalidRecordError,
  requireCalendarDate,
  requireCents,
  requireKnownFieldsOnly,
  requireText,
} from '../validation'

function isoDaysFromToday(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('requireText', () => {
  it('returns the trimmed value', () => {
    expect(requireText('  Maple Leaf  ', 'name', 200)).toBe('Maple Leaf')
  })

  it('rejects a non-string', () => {
    expect(() => requireText(42, 'name', 200)).toThrow()
    expect(() => requireText(null, 'name', 200)).toThrow()
    expect(() => requireText(undefined, 'name', 200)).toThrow()
  })

  it('rejects an empty or whitespace-only string', () => {
    expect(() => requireText('', 'name', 200)).toThrow()
    expect(() => requireText('   ', 'name', 200)).toThrow()
  })

  it('rejects a string past the limit but accepts one at the limit', () => {
    expect(() => requireText('x'.repeat(201), 'name', 200)).toThrow()
    expect(requireText('x'.repeat(200), 'name', 200)).toHaveLength(200)
  })
})

describe('requireKnownFieldsOnly', () => {
  it('returns the body when every field is allowed', () => {
    const body = { name: 'x', bookingName: 'y' }
    expect(requireKnownFieldsOnly(body, ['name', 'bookingName'])).toBe(body)
  })

  it('rejects a body that is not a plain object', () => {
    expect(() => requireKnownFieldsOnly(null, ['name'])).toThrow()
    expect(() => requireKnownFieldsOnly('name=x', ['name'])).toThrow()
    expect(() => requireKnownFieldsOnly([{ name: 'x' }], ['name'])).toThrow()
  })

  it('rejects a field outside the allowed list', () => {
    expect(() => requireKnownFieldsOnly({ name: 'x', weight: 1 }, ['name'])).toThrow()
  })

  it('rejects a server-assigned field the caller tries to supply', () => {
    expect(() => requireKnownFieldsOnly({ name: 'x', userId: 'someone' }, ['name'])).toThrow()
    expect(() => requireKnownFieldsOnly({ name: 'x', id: 'forged' }, ['name'])).toThrow()
  })
})

describe('reject', () => {
  it('throws an InvalidRecordError callers can recognise', () => {
    let caught: unknown
    try {
      requireText('', 'name', 200)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(InvalidRecordError)
    expect((caught as Error).name).toBe('InvalidRecordError')
  })
})

describe('requireCalendarDate', () => {
  it('returns a past date unchanged', () => {
    expect(requireCalendarDate('2024-11-03', 'payoutDate')).toBe('2024-11-03')
  })

  it('accepts today', () => {
    expect(requireCalendarDate(isoDaysFromToday(0), 'payoutDate')).toBe(isoDaysFromToday(0))
  })

  it('rejects a date in the future', () => {
    expect(() => requireCalendarDate(isoDaysFromToday(1), 'payoutDate')).toThrow(/payoutDate/)
  })

  it('rejects a date the calendar does not have', () => {
    expect(() => requireCalendarDate('2024-02-30', 'payoutDate')).toThrow()
    expect(() => requireCalendarDate('2024-13-01', 'payoutDate')).toThrow()
  })

  it('rejects anything that is not a plain YYYY-MM-DD string', () => {
    expect(() => requireCalendarDate('10.09.2026', 'payoutDate')).toThrow()
    expect(() => requireCalendarDate(20260910, 'payoutDate')).toThrow()
    expect(() => requireCalendarDate(undefined, 'payoutDate')).toThrow()
  })
})

describe('requireCents', () => {
  it('returns a positive whole number of cents', () => {
    expect(requireCents(1250, 'amountCents')).toBe(1250)
    expect(requireCents(1, 'amountCents')).toBe(1)
  })

  it('rejects zero and negative amounts', () => {
    expect(() => requireCents(0, 'amountCents')).toThrow(/greater than zero/)
    expect(() => requireCents(-1, 'amountCents')).toThrow()
  })

  it('rejects fractions of a cent and non-numbers', () => {
    expect(() => requireCents(12.5, 'amountCents')).toThrow()
    expect(() => requireCents('100', 'amountCents')).toThrow()
    expect(() => requireCents(undefined, 'amountCents')).toThrow()
  })
})

describe('centsFromEuros', () => {
  it('converts euros to whole cents', () => {
    expect(centsFromEuros(12.5)).toBe(1250)
    expect(centsFromEuros(0.01)).toBe(1)
    expect(centsFromEuros(1234)).toBe(123400)
    expect(centsFromEuros(1234.56)).toBe(123456)
  })

  it('survives binary floating point', () => {
    expect(centsFromEuros(0.07)).toBe(7)
    expect(centsFromEuros(8.28)).toBe(828)
  })

  it('rejects more than two decimals', () => {
    expect(() => centsFromEuros(12.505)).toThrow(/two decimals/)
  })

  it('rejects amounts that are not positive numbers', () => {
    expect(() => centsFromEuros(0)).toThrow()
    expect(() => centsFromEuros(-5)).toThrow()
    expect(() => centsFromEuros('12')).toThrow()
    expect(() => centsFromEuros(Number.NaN)).toThrow()
  })
})
