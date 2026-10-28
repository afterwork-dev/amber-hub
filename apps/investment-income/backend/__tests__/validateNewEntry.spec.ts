import { describe, it, expect } from 'vitest'
import { validateNewEntry } from '../validateNewEntry'

const valid = { payoutDate: '2026-09-10', amountCents: 1250, assetId: 'asset-1' }

function isoDaysFromToday(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('validateNewEntry', () => {
  it('accepts a valid payout', () => {
    expect(validateNewEntry(valid)).toEqual(valid)
  })

  it('accepts a payout dated today', () => {
    const today = isoDaysFromToday(0)

    expect(validateNewEntry({ ...valid, payoutDate: today }).payoutDate).toBe(today)
  })

  it('trims the asset id', () => {
    expect(validateNewEntry({ ...valid, assetId: '  asset-1  ' }).assetId).toBe('asset-1')
  })

  it('returns exactly the three entry fields', () => {
    expect(Object.keys(validateNewEntry(valid)).sort()).toEqual([
      'amountCents',
      'assetId',
      'payoutDate',
    ])
  })

  it('rejects a body that is not a plain object', () => {
    expect(() => validateNewEntry(null)).toThrow()
    expect(() => validateNewEntry('payoutDate=2026-09-10')).toThrow()
    expect(() => validateNewEntry([valid])).toThrow()
  })

  it('rejects a missing field', () => {
    expect(() => validateNewEntry({ amountCents: 1250, assetId: 'asset-1' })).toThrow(/payoutDate/)
    expect(() => validateNewEntry({ payoutDate: '2026-09-10', assetId: 'asset-1' })).toThrow(
      /amountCents/,
    )
    expect(() => validateNewEntry({ payoutDate: '2026-09-10', amountCents: 1250 })).toThrow(
      /assetId/,
    )
  })

  it('rejects a payout date in the future or off the calendar', () => {
    expect(() => validateNewEntry({ ...valid, payoutDate: isoDaysFromToday(1) })).toThrow()
    expect(() => validateNewEntry({ ...valid, payoutDate: '2024-02-30' })).toThrow()
    expect(() => validateNewEntry({ ...valid, payoutDate: '10.09.2026' })).toThrow()
  })

  it('rejects an amount that is not a positive whole number of cents', () => {
    expect(() => validateNewEntry({ ...valid, amountCents: 0 })).toThrow()
    expect(() => validateNewEntry({ ...valid, amountCents: -100 })).toThrow()
    expect(() => validateNewEntry({ ...valid, amountCents: 12.5 })).toThrow()
    expect(() => validateNewEntry({ ...valid, amountCents: '1250' })).toThrow()
  })

  it('rejects an empty asset id', () => {
    expect(() => validateNewEntry({ ...valid, assetId: '' })).toThrow()
    expect(() => validateNewEntry({ ...valid, assetId: '   ' })).toThrow()
    expect(() => validateNewEntry({ ...valid, assetId: 42 })).toThrow()
  })

  it('rejects an unknown field', () => {
    expect(() => validateNewEntry({ ...valid, note: 'dividend' })).toThrow(/note/)
  })

  it('rejects the holdings shape this app used to store', () => {
    expect(() =>
      validateNewEntry({ name: 'Krugerrand', categoryId: 'category-gold', locationId: 'location-1' }),
    ).toThrow()
  })

  it('rejects server-assigned fields the caller tries to supply', () => {
    expect(() => validateNewEntry({ ...valid, userId: 'someone-else' })).toThrow(/userId/)
    expect(() => validateNewEntry({ ...valid, id: 'forged' })).toThrow(/id/)
    expect(() => validateNewEntry({ ...valid, createdAt: '2026-09-13T00:00:00.000Z' })).toThrow(
      /createdAt/,
    )
  })
})
