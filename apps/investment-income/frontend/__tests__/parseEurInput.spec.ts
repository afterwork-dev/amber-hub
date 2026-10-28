import { describe, it, expect } from 'vitest'
import { parseEurInput } from '../parseEurInput'

describe('parseEurInput', () => {
  it('reads thousands separators and cents', () => {
    expect(parseEurInput('1.234,56')).toEqual({ valid: true, cents: 123456 })
  })

  it('reads a whole amount as cents', () => {
    expect(parseEurInput('12')).toEqual({ valid: true, cents: 1200 })
  })

  it('pads a single decimal place', () => {
    expect(parseEurInput('0,5')).toEqual({ valid: true, cents: 50 })
  })

  it('treats zero as a real amount, not as absent', () => {
    expect(parseEurInput('0')).toEqual({ valid: true, cents: 0 })
    expect(parseEurInput('0,00')).toEqual({ valid: true, cents: 0 })
  })

  it('reads blank input as absent rather than zero', () => {
    expect(parseEurInput('')).toEqual({ valid: true })
    expect(parseEurInput('   ')).toEqual({ valid: true })
  })

  it('ignores surrounding whitespace', () => {
    expect(parseEurInput('  7,25  ')).toEqual({ valid: true, cents: 725 })
  })

  it('rejects input that is not an amount', () => {
    expect(parseEurInput('abc')).toEqual({ valid: false })
    expect(parseEurInput('12 €')).toEqual({ valid: false })
    expect(parseEurInput('1,2,3')).toEqual({ valid: false })
    expect(parseEurInput('1.2.3')).toEqual({ valid: false })
  })

  it('rejects negative amounts', () => {
    expect(parseEurInput('-5')).toEqual({ valid: false })
    expect(parseEurInput('-0,01')).toEqual({ valid: false })
  })

  it('rejects more than two decimal places', () => {
    expect(parseEurInput('1,2345')).toEqual({ valid: false })
    expect(parseEurInput('1.234,567')).toEqual({ valid: false })
  })

  it('takes a dot as the decimal separator too', () => {
    expect(parseEurInput('12.34')).toEqual({ valid: true, cents: 1234 })
    expect(parseEurInput('1.23')).toEqual({ valid: true, cents: 123 })
    expect(parseEurInput('0.5')).toEqual({ valid: true, cents: 50 })
  })

  it('reads a lone separator before three digits as a thousands group', () => {
    expect(parseEurInput('1.234')).toEqual({ valid: true, cents: 123400 })
    expect(parseEurInput('1,234')).toEqual({ valid: true, cents: 123400 })
  })

  it('lets the last separator decide when both are used', () => {
    expect(parseEurInput('1.234,56')).toEqual({ valid: true, cents: 123456 })
    expect(parseEurInput('1,234.56')).toEqual({ valid: true, cents: 123456 })
    expect(parseEurInput('1.234.567,89')).toEqual({ valid: true, cents: 123456789 })
    expect(parseEurInput('1,234,567.89')).toEqual({ valid: true, cents: 123456789 })
  })

  it('rejects malformed thousands groups', () => {
    expect(parseEurInput('1.2345')).toEqual({ valid: false })
    expect(parseEurInput('1234.567,89')).toEqual({ valid: false })
    expect(parseEurInput('1.23.456')).toEqual({ valid: false })
  })

  it('rejects a trailing separator', () => {
    expect(parseEurInput('12.')).toEqual({ valid: false })
    expect(parseEurInput('12,')).toEqual({ valid: false })
  })

  it('returns exact integers for amounts a float would round', () => {
    expect(parseEurInput('1.234.567,89')).toEqual({ valid: true, cents: 123456789 })
    expect(parseEurInput('0,07')).toEqual({ valid: true, cents: 7 })
    expect(parseEurInput('8,29')).toEqual({ valid: true, cents: 829 })
  })
})
