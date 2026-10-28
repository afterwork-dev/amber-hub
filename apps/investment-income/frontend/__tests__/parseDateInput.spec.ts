import { describe, it, expect } from 'vitest'
import { parseDateInput } from '../parseDateInput'

describe('parseDateInput', () => {
  it('reads DD-MM-YYYY as an ISO date', () => {
    expect(parseDateInput('03-11-2024')).toBe('2024-11-03')
    expect(parseDateInput('  29-02-2024 ')).toBe('2024-02-29')
  })

  it('pads a single-digit day or month', () => {
    expect(parseDateInput('3-1-2024')).toBe('2024-01-03')
  })

  it('refuses anything that is not day-month-year', () => {
    expect(parseDateInput('2024-11-03')).toBeNull()
    expect(parseDateInput('03.11.2024')).toBeNull()
    expect(parseDateInput('03-11-24')).toBeNull()
    expect(parseDateInput('')).toBeNull()
    expect(parseDateInput('yesterday')).toBeNull()
  })
})
