import { describe, it, expect } from 'vitest'
import { categoryTotals, entriesOf, summarizeMonths } from '../monthSummary'
import { entryFactory } from './entryFactory'

describe('entriesOf', () => {
  it('keeps only the given month', () => {
    const september = entryFactory({ month: '2026-09' })
    expect(entriesOf([september, entryFactory({ month: '2026-08' })], '2026-09')).toEqual([
      september,
    ])
  })
})

describe('summarizeMonths', () => {
  it('totals each month, newest first, counting quantity and negative amounts', () => {
    const entries = [
      entryFactory({ month: '2026-08', amountCents: 1000 }),
      entryFactory({ month: '2026-09', amountCents: 50000, quantity: 3 }),
      entryFactory({ month: '2026-09', amountCents: -20000 }),
    ]

    expect(summarizeMonths(entries)).toEqual([
      { month: '2026-09', assetsCents: 150000, liabilitiesCents: -20000, networthCents: 130000 },
      { month: '2026-08', assetsCents: 1000, liabilitiesCents: 0, networthCents: 1000 },
    ])
  })
})

describe('categoryTotals', () => {
  it('sums the positive values per category, in the fixed category order', () => {
    const entries = [
      entryFactory({ category: 'cash', amountCents: 1000 }),
      entryFactory({ category: 'commodities', amountCents: 50000, quantity: 2 }),
      entryFactory({ category: 'cash', amountCents: 500 }),
    ]

    expect(categoryTotals(entries)).toEqual([
      { category: 'commodities', title: 'Commodities', valueCents: 100000 },
      { category: 'cash', title: 'Cash', valueCents: 1500 },
    ])
  })

  it('leaves liabilities out of the asset distribution', () => {
    const entries = [
      entryFactory({ category: 'real-estate', amountCents: 30000000 }),
      entryFactory({ category: 'real-estate', amountCents: -12900000 }),
      entryFactory({ category: 'cash', amountCents: -5000 }),
    ]

    expect(categoryTotals(entries)).toEqual([
      { category: 'real-estate', title: 'Real Estate', valueCents: 30000000 },
    ])
  })
})
