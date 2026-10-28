import { describe, it, expect } from 'vitest'
import { formatEur, formatPayoutDate } from '../formatEntry'

describe('formatEur', () => {
  it('groups thousands and always shows two decimals', () => {
    expect(formatEur(123456)).toBe('1.234,56 €')
    expect(formatEur(1200)).toBe('12,00 €')
    expect(formatEur(123456789)).toBe('1.234.567,89 €')
  })

  it('pads a single cent digit', () => {
    expect(formatEur(7)).toBe('0,07 €')
    expect(formatEur(50)).toBe('0,50 €')
  })
})

describe('formatPayoutDate', () => {
  it('renders a YYYY-MM-DD date the way a German reader expects', () => {
    expect(formatPayoutDate('2026-09-10')).toBe('10.09.2026')
    expect(formatPayoutDate('2026-03-01')).toBe('01.03.2026')
  })

  it('keeps the parts the stored string already pads', () => {
    expect(formatPayoutDate('2026-01-05')).toBe('05.01.2026')
    expect(formatPayoutDate('1999-12-31')).toBe('31.12.1999')
  })

  // A Date would shift the day for anyone west of UTC; the payout date has no time component.
  it('never shifts the day, whatever the machine timezone', () => {
    expect(formatPayoutDate('2026-01-01')).toBe('01.01.2026')
    expect(formatPayoutDate('2026-12-31')).toBe('31.12.2026')
  })
})
