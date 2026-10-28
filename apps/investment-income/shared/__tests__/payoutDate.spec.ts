import { describe, it, expect } from 'vitest'
import { isValidPayoutDate } from '../payoutDate'

function isoDaysFromToday(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('isValidPayoutDate', () => {
  it('accepts a past calendar date', () => {
    expect(isValidPayoutDate('2024-11-03')).toBe(true)
    expect(isValidPayoutDate('1970-01-01')).toBe(true)
  })

  it('accepts today', () => {
    expect(isValidPayoutDate(isoDaysFromToday(0))).toBe(true)
  })

  it('accepts a leap day that exists', () => {
    expect(isValidPayoutDate('2024-02-29')).toBe(true)
  })

  it('rejects a date in the future', () => {
    expect(isValidPayoutDate(isoDaysFromToday(1))).toBe(false)
    expect(isValidPayoutDate(isoDaysFromToday(400))).toBe(false)
  })

  it('rejects a date that is not on the calendar', () => {
    expect(isValidPayoutDate('2024-02-30')).toBe(false)
    expect(isValidPayoutDate('2023-02-29')).toBe(false)
    expect(isValidPayoutDate('2024-13-01')).toBe(false)
    expect(isValidPayoutDate('2024-00-10')).toBe(false)
  })

  it('rejects anything that is not a plain YYYY-MM-DD date', () => {
    expect(isValidPayoutDate('03.11.2024')).toBe(false)
    expect(isValidPayoutDate('2024-11-03T10:00:00Z')).toBe(false)
    expect(isValidPayoutDate('2024-11-3')).toBe(false)
    expect(isValidPayoutDate('')).toBe(false)
    expect(isValidPayoutDate('yesterday')).toBe(false)
  })
})
