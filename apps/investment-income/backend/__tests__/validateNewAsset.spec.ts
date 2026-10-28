import { describe, it, expect } from 'vitest'
import { validateNewAsset } from '../validateNewAsset'

const minimal = { name: 'Vanguard FTSE All-World' }

describe('validateNewAsset', () => {
  it('accepts a minimal asset', () => {
    expect(validateNewAsset(minimal)).toEqual(minimal)
  })

  it('trims the name', () => {
    expect(validateNewAsset({ name: '  Flat 4  ' }).name).toBe('Flat 4')
  })

  it('returns only the name', () => {
    expect(Object.keys(validateNewAsset(minimal))).toEqual(['name'])
  })

  it('rejects a body that is not an object', () => {
    expect(() => validateNewAsset(null)).toThrow()
    expect(() => validateNewAsset('name=x')).toThrow()
    expect(() => validateNewAsset([minimal])).toThrow()
  })

  it('rejects a missing, empty, or whitespace-only name', () => {
    expect(() => validateNewAsset({})).toThrow()
    expect(() => validateNewAsset({ name: '' })).toThrow()
    expect(() => validateNewAsset({ name: '   ' })).toThrow()
    expect(() => validateNewAsset({ name: 42 })).toThrow()
  })

  it('rejects a name beyond the length bound', () => {
    expect(() => validateNewAsset({ name: 'x'.repeat(201) })).toThrow()
    expect(validateNewAsset({ name: 'x'.repeat(200) }).name).toHaveLength(200)
  })

  it('rejects unknown fields', () => {
    expect(() => validateNewAsset({ ...minimal, weightGrams: 31 })).toThrow()
  })

  it('rejects a body trying to supply server-assigned fields', () => {
    expect(() => validateNewAsset({ ...minimal, userId: 'someone-else' })).toThrow()
    expect(() => validateNewAsset({ ...minimal, id: 'forged-id' })).toThrow()
    expect(() => validateNewAsset({ ...minimal, createdAt: '1999-01-01T00:00:00Z' })).toThrow()
  })

  it('accepts and trims an optional booking name', () => {
    expect(validateNewAsset({ name: 'Vanguard', bookingName: '  VANG FTSE AW  ' })).toEqual({
      name: 'Vanguard',
      bookingName: 'VANG FTSE AW',
    })
  })

  it('drops an absent booking name rather than emitting null', () => {
    expect(Object.keys(validateNewAsset(minimal))).toEqual(['name'])
  })

  it('rejects an empty, whitespace-only, or over-long booking name', () => {
    expect(() => validateNewAsset({ ...minimal, bookingName: '' })).toThrow()
    expect(() => validateNewAsset({ ...minimal, bookingName: '   ' })).toThrow()
    expect(() => validateNewAsset({ ...minimal, bookingName: 'x'.repeat(201) })).toThrow()
    expect(validateNewAsset({ ...minimal, bookingName: 'x'.repeat(200) }).bookingName).toHaveLength(
      200,
    )
  })
})
