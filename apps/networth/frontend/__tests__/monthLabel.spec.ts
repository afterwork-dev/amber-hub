import { describe, it, expect } from 'vitest'
import { formatMonth, formatMonthShort } from '../monthLabel'

describe('formatMonth', () => {
  it('names the month and year', () => {
    expect(formatMonth('2026-09')).toBe('September 2026')
    expect(formatMonth('2024-01')).toBe('January 2024')
  })
})

describe('formatMonthShort', () => {
  it('abbreviates for chart axes', () => {
    expect(formatMonthShort('2026-09')).toBe("Sep '26")
    expect(formatMonthShort('2023-12')).toBe("Dec '23")
  })
})
