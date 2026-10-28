import { describe, it, expect } from 'vitest'
import { validateMonthEntries } from '../validateMonthEntries'

const gold = { name: 'Gold 5g', category: 'commodities', amountCents: 50000, quantity: 3 }

describe('validateMonthEntries', () => {
  it('returns the validated entries, trimmed', () => {
    expect(validateMonthEntries({ entries: [{ ...gold, name: ' Gold 5g ' }] })).toEqual([gold])
  })

  it('keeps the id of an existing entry', () => {
    expect(validateMonthEntries({ entries: [{ ...gold, id: 'entry-1' }] })).toEqual([
      { ...gold, id: 'entry-1' },
    ])
  })

  it('rejects an empty or invalid id', () => {
    expect(() => validateMonthEntries({ entries: [{ ...gold, id: '' }] })).toThrow(/id/)
    expect(() => validateMonthEntries({ entries: [{ ...gold, id: 7 }] })).toThrow(/id/)
  })

  it('requires between one and a hundred entries', () => {
    expect(() => validateMonthEntries({ entries: [] })).toThrow(/1 to 100/)
    expect(() => validateMonthEntries({ entries: Array(101).fill(gold) })).toThrow(/1 to 100/)
    expect(() => validateMonthEntries({ entries: 'all' })).toThrow(/1 to 100/)
    expect(() => validateMonthEntries({})).toThrow(/1 to 100/)
  })

  it('rejects unknown fields on the body and on an entry', () => {
    expect(() => validateMonthEntries({ entries: [gold], month: '2026-09' })).toThrow(/unknown/)
    expect(() => validateMonthEntries({ entries: [{ ...gold, userId: 'x' }] })).toThrow(/unknown/)
  })

  it('rejects an entry with an invalid field', () => {
    expect(() => validateMonthEntries({ entries: [{ ...gold, name: '' }] })).toThrow(/name/)
    expect(() => validateMonthEntries({ entries: [{ ...gold, category: 'x' }] })).toThrow()
    expect(() => validateMonthEntries({ entries: [{ ...gold, amountCents: 0.5 }] })).toThrow()
    expect(() => validateMonthEntries({ entries: [{ ...gold, quantity: -1 }] })).toThrow()
  })
})
