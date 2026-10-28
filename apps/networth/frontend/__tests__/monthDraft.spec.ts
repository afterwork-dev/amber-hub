import { describe, it, expect } from 'vitest'
import {
  defaultNewMonth,
  editRows,
  emptyRow,
  prefillRows,
  rowValueCents,
  toMonthEntry,
  type DraftRow,
} from '../monthDraft'
import { entryFactory } from './entryFactory'

function row(overrides: Partial<DraftRow> = {}): DraftRow {
  return { ...emptyRow(), name: 'Gold 5g', category: 'commodities', amount: '500', ...overrides }
}

describe('emptyRow', () => {
  it('starts blank with a quantity of one and a fresh key', () => {
    const first = emptyRow()

    expect(first).toMatchObject({ name: '', category: null, amount: '', quantity: '1' })
    expect(emptyRow().key).not.toBe(first.key)
  })
})

describe('prefillRows', () => {
  it('copies name, category and quantity but leaves amounts empty', () => {
    const [prefilled] = prefillRows([
      entryFactory({ name: 'Gold 5g', category: 'commodities', amountCents: 50000, quantity: 2.5 }),
    ])

    expect(prefilled).toMatchObject({
      name: 'Gold 5g',
      category: 'commodities',
      amount: '',
      quantity: '2,5',
    })
    expect(prefilled?.id).toBeUndefined()
  })

  it('leaves a liability’s amount empty too', () => {
    const [prefilled] = prefillRows([entryFactory({ amountCents: -12900825 })])

    expect(prefilled?.amount).toBe('')
  })
})

describe('editRows', () => {
  it('carries the stored id and amount', () => {
    const [edited] = editRows([entryFactory({ id: 'entry-9', amountCents: -12900825 })])

    expect(edited).toMatchObject({ id: 'entry-9', amount: '-129.008,25', quantity: '1' })
  })
})

describe('defaultNewMonth', () => {
  const today = new Date(2026, 9, 18)

  it('picks the current month when nothing is recorded yet', () => {
    expect(defaultNewMonth(undefined, today)).toBe('2026-10')
  })

  it('picks the month after the latest recorded one', () => {
    expect(defaultNewMonth('2026-07', today)).toBe('2026-08')
  })

  it('never picks a future month', () => {
    expect(defaultNewMonth('2026-10', today)).toBe('2026-10')
  })
})

describe('rowValueCents', () => {
  it('multiplies amount and quantity', () => {
    expect(rowValueCents(row({ amount: '500', quantity: '3' }))).toBe(150000)
  })

  it('is null while the amount or quantity cannot be read', () => {
    expect(rowValueCents(row({ amount: '' }))).toBeNull()
    expect(rowValueCents(row({ amount: 'abc' }))).toBeNull()
    expect(rowValueCents(row({ quantity: 'x' }))).toBeNull()
  })
})

describe('toMonthEntry', () => {
  it('turns a valid row into the entry the backend takes', () => {
    expect(toMonthEntry(row({ name: ' Gold 5g ', amount: '-1.234,56', quantity: '2' }))).toEqual({
      name: 'Gold 5g',
      category: 'commodities',
      amountCents: -123456,
      quantity: 2,
    })
  })

  it('keeps the id of an existing entry', () => {
    expect(toMonthEntry(row({ id: 'entry-1' }))).toMatchObject({ id: 'entry-1' })
  })

  it('is null for a row that cannot be read', () => {
    expect(toMonthEntry(row({ category: null }))).toBeNull()
    expect(toMonthEntry(row({ amount: '' }))).toBeNull()
    expect(toMonthEntry(row({ quantity: '' }))).toBeNull()
  })
})
