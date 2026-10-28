import { describe, it, expect } from 'vitest'
import { isValidMonth, monthOf, nextMonth } from '../entryMonth'

const TODAY = new Date(2026, 9, 18)

describe('monthOf', () => {
  it('formats a date as its calendar month', () => {
    expect(monthOf(new Date(2026, 0, 31))).toBe('2026-01')
    expect(monthOf(new Date(2026, 11, 1))).toBe('2026-12')
  })
})

describe('isValidMonth', () => {
  it('accepts past months and the current month', () => {
    expect(isValidMonth('2023-06', TODAY)).toBe(true)
    expect(isValidMonth('2026-10', TODAY)).toBe(true)
  })

  it('rejects future months', () => {
    expect(isValidMonth('2026-11', TODAY)).toBe(false)
    expect(isValidMonth('2027-01', TODAY)).toBe(false)
  })

  it('rejects anything that is not a YYYY-MM month', () => {
    expect(isValidMonth('2026-13', TODAY)).toBe(false)
    expect(isValidMonth('2026-00', TODAY)).toBe(false)
    expect(isValidMonth('2026-9', TODAY)).toBe(false)
    expect(isValidMonth('2026-09-01', TODAY)).toBe(false)
    expect(isValidMonth('', TODAY)).toBe(false)
  })

  it('defaults to the real current month', () => {
    expect(isValidMonth(monthOf(new Date()))).toBe(true)
  })
})

describe('nextMonth', () => {
  it('moves to the following month, across a year boundary', () => {
    expect(nextMonth('2026-09')).toBe('2026-10')
    expect(nextMonth('2026-12')).toBe('2027-01')
  })
})
