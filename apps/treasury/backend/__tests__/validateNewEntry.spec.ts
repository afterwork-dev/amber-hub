import { describe, it, expect } from 'vitest'
import { validateNewEntry } from '../validateNewEntry'

const minimal = { name: 'Krugerrand', categoryId: 'category-gold', locationId: 'location-1' }

function isoDaysFromToday(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('validateNewEntry', () => {
  it('accepts a minimal entry', () => {
    expect(validateNewEntry(minimal)).toEqual(minimal)
  })

  it('accepts a fully populated entry', () => {
    const full = {
      name: 'Krugerrand 1 oz',
      categoryId: 'category-collectible',
      serialNo: 'K-2020-0042',
      purchaseDate: '2024-11-03',
      purchaseValueCents: 245050,
      locationId: 'location-2',
    }

    expect(validateNewEntry(full)).toEqual(full)
  })

  it('trims the free-text fields', () => {
    const result = validateNewEntry({ ...minimal, name: '  Maple Leaf  ', serialNo: '  ML-1  ' })

    expect(result.name).toBe('Maple Leaf')
    expect(result.serialNo).toBe('ML-1')
  })

  it('drops absent optional fields rather than emitting null', () => {
    expect(Object.keys(validateNewEntry(minimal)).sort()).toEqual([
      'categoryId',
      'locationId',
      'name',
    ])
  })

  it('rejects a body that is not an object', () => {
    expect(() => validateNewEntry(null)).toThrow()
    expect(() => validateNewEntry('name=x')).toThrow()
    expect(() => validateNewEntry([minimal])).toThrow()
  })

  it('rejects a missing, empty, or whitespace-only name', () => {
    expect(() => validateNewEntry({ locationId: 'location-1' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, name: '' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, name: '   ' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, name: 42 })).toThrow()
  })

  it('rejects a name beyond the length bound', () => {
    expect(() => validateNewEntry({ ...minimal, name: 'x'.repeat(201) })).toThrow()
    expect(validateNewEntry({ ...minimal, name: 'x'.repeat(200) }).name).toHaveLength(200)
  })

  it('rejects an empty or over-long serial number', () => {
    expect(() => validateNewEntry({ ...minimal, serialNo: '   ' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, serialNo: 'x'.repeat(201) })).toThrow()
  })

  it('returns the chosen category unchanged alongside the location', () => {
    expect(validateNewEntry({ ...minimal, categoryId: 'category-inheritance' })).toMatchObject({
      categoryId: 'category-inheritance',
      locationId: 'location-1',
    })
  })

  it('rejects a missing, unknown, or non-string category', () => {
    const withoutCategory = { name: minimal.name, locationId: minimal.locationId }

    expect(() => validateNewEntry(withoutCategory)).toThrow()
    expect(() => validateNewEntry({ ...minimal, categoryId: 'category-platinum' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, categoryId: 'Gold' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, categoryId: '' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, categoryId: 42 })).toThrow()
  })

  it('rejects a missing or unknown location', () => {
    expect(() => validateNewEntry({ name: 'x' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, locationId: 'location-99' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, locationId: 'Location 1' })).toThrow()
  })

  it('accepts zero but rejects negative or fractional cents', () => {
    expect(validateNewEntry({ ...minimal, purchaseValueCents: 0 }).purchaseValueCents).toBe(0)
    expect(() => validateNewEntry({ ...minimal, purchaseValueCents: -1 })).toThrow()
    expect(() => validateNewEntry({ ...minimal, purchaseValueCents: 12.5 })).toThrow()
    expect(() => validateNewEntry({ ...minimal, purchaseValueCents: '100' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, purchaseValueCents: Number.NaN })).toThrow()
  })

  it('accepts a past purchase date', () => {
    expect(validateNewEntry({ ...minimal, purchaseDate: '2024-11-03' }).purchaseDate).toBe(
      '2024-11-03',
    )
    expect(validateNewEntry({ ...minimal, purchaseDate: isoDaysFromToday(0) })).toBeTruthy()
  })

  it('rejects a purchase date in the future', () => {
    expect(() => validateNewEntry({ ...minimal, purchaseDate: isoDaysFromToday(1) })).toThrow()
  })

  it('rejects a malformed or impossible purchase date', () => {
    expect(() => validateNewEntry({ ...minimal, purchaseDate: '2024-13-01' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, purchaseDate: '2024-02-30' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, purchaseDate: '03.11.2024' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, purchaseDate: '2024-11-03T10:00:00Z' })).toThrow()
  })

  it('rejects unknown fields', () => {
    expect(() => validateNewEntry({ ...minimal, weightGrams: 31 })).toThrow()
  })

  it('rejects a body trying to supply server-assigned fields', () => {
    expect(() => validateNewEntry({ ...minimal, userId: 'someone-else' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, id: 'forged-id' })).toThrow()
    expect(() => validateNewEntry({ ...minimal, createdAt: '1999-01-01T00:00:00Z' })).toThrow()
  })
})
