import { describe, it, expect } from 'vitest'
import type { InvestmentIncomeAsset, InvestmentIncomeEntry } from '../../shared/types'
import { summarizeAssetIncome, summarizeYearlyIncome } from '../assetIncome'

function asset(id: string, name: string): InvestmentIncomeAsset {
  return { id, userId: 'user-1', name, createdAt: '2026-09-12T10:14:05.213Z' }
}

function payout(assetId: string, amountCents: number): InvestmentIncomeEntry {
  return {
    id: `entry-${assetId}-${amountCents}`,
    userId: 'user-1',
    payoutDate: '2026-09-10',
    amountCents,
    assetId,
    createdAt: '2026-09-13T09:41:12.008Z',
  }
}

const vanguard = asset('asset-1', 'Vanguard FTSE All-World')
const flat = asset('asset-2', 'Flat, Main Street 4')

describe('summarizeAssetIncome', () => {
  it('sums every payout of an asset into one cumulative total', () => {
    const summaries = summarizeAssetIncome(
      [vanguard],
      [payout('asset-1', 1000), payout('asset-1', 550), payout('asset-1', 450)],
    )

    expect(summaries).toEqual([
      { assetId: 'asset-1', name: 'Vanguard FTSE All-World', totalCents: 2000 },
    ])
  })

  it('reports an asset with no payouts at zero rather than leaving it out', () => {
    expect(summarizeAssetIncome([vanguard], [])).toEqual([
      { assetId: 'asset-1', name: 'Vanguard FTSE All-World', totalCents: 0 },
    ])
  })

  it('adds cents exactly, never drifting through a rounded value', () => {
    const cents = Array.from({ length: 10 }, () => payout('asset-1', 1))

    expect(summarizeAssetIncome([vanguard], cents)[0]?.totalCents).toBe(10)
  })

  it('attributes each payout to its own asset', () => {
    const summaries = summarizeAssetIncome(
      [vanguard, flat],
      [payout('asset-1', 1250), payout('asset-2', 123456), payout('asset-2', 44)],
    )
    const totalOf = (assetId: string) =>
      summaries.find((summary) => summary.assetId === assetId)?.totalCents

    expect(totalOf('asset-1')).toBe(1250)
    expect(totalOf('asset-2')).toBe(123500)
  })

  it('counts a payout of an asset that is not the caller’s towards nothing', () => {
    const summaries = summarizeAssetIncome(
      [vanguard],
      [payout('asset-1', 1250), payout('asset-gone', 9900)],
    )

    expect(summaries).toEqual([
      { assetId: 'asset-1', name: 'Vanguard FTSE All-World', totalCents: 1250 },
    ])
  })

  it('gives an unknown asset no card of its own', () => {
    const summaries = summarizeAssetIncome([vanguard], [payout('asset-gone', 9900)])

    expect(summaries).toHaveLength(1)
    expect(summaries.map((summary) => summary.assetId)).not.toContain('asset-gone')
  })

  it('returns exactly one summary per asset, whatever the entries hold', () => {
    const assets = [vanguard, flat, asset('asset-3', 'Bond ladder')]

    for (const entries of [[], [payout('asset-1', 1)], [payout('asset-gone', 1)]]) {
      expect(summarizeAssetIncome(assets, entries)).toHaveLength(assets.length)
    }
  })

  it('has nothing to show when the user owns no assets', () => {
    expect(summarizeAssetIncome([], [payout('asset-1', 1250)])).toEqual([])
  })

  it('carries the asset’s name through untouched, so the card can label itself', () => {
    expect(summarizeAssetIncome([flat], [])[0]?.name).toBe('Flat, Main Street 4')
  })
})

describe('summarizeAssetIncome ordering', () => {
  function namesOf(assets: InvestmentIncomeAsset[], entries: InvestmentIncomeEntry[] = []) {
    return summarizeAssetIncome(assets, entries).map((summary) => summary.name)
  }

  it('orders the assets alphabetically by name', () => {
    const names = namesOf([
      asset('asset-1', 'Rental Flat'),
      asset('asset-2', 'Amundi MSCI World'),
      asset('asset-3', 'Vanguard FTSE All-World'),
    ])

    expect(names).toEqual(['Amundi MSCI World', 'Rental Flat', 'Vanguard FTSE All-World'])
  })

  it('ignores capitalisation, so a lower-case name is not banished to the end', () => {
    const names = namesOf([
      asset('asset-1', 'Rental Flat'),
      asset('asset-2', 'bond ladder'),
      asset('asset-3', 'Amundi MSCI World'),
    ])

    expect(names).toEqual(['Amundi MSCI World', 'bond ladder', 'Rental Flat'])
  })

  it('sorts an accented name beside its base letter, not after Z', () => {
    const names = namesOf([
      asset('asset-1', 'Zebra Corp'),
      asset('asset-2', 'ätna Fund'),
      asset('asset-3', 'Amundi MSCI World'),
      asset('asset-4', 'Öl AG'),
      asset('asset-5', 'Bond ladder'),
    ])

    expect(names).toEqual([
      'Amundi MSCI World',
      'ätna Fund',
      'Bond ladder',
      'Öl AG',
      'Zebra Corp',
    ])
  })

  it('keeps both assets when two share a name, in an order that does not shift', () => {
    const first = asset('asset-1', 'Rental Flat')
    const second = asset('asset-2', 'Rental Flat')

    const forwards = summarizeAssetIncome([first, second], [])
    const backwards = summarizeAssetIncome([second, first], [])

    expect(forwards).toHaveLength(2)
    expect(forwards.map((summary) => summary.assetId)).toEqual(['asset-1', 'asset-2'])
    expect(backwards).toEqual(forwards)
  })

  it('leaves an asset that has earned nothing in its alphabetical place', () => {
    const names = namesOf(
      [asset('asset-1', 'Amundi MSCI World'), asset('asset-2', 'Bond ladder')],
      [payout('asset-2', 90000)],
    )

    expect(names).toEqual(['Amundi MSCI World', 'Bond ladder'])
  })

  it('never lets the cumulative income decide the order', () => {
    const assets = [
      asset('asset-1', 'Amundi MSCI World'),
      asset('asset-2', 'Bond ladder'),
      asset('asset-3', 'Vanguard FTSE All-World'),
    ]
    const expected = ['Amundi MSCI World', 'Bond ladder', 'Vanguard FTSE All-World']

    expect(namesOf(assets)).toEqual(expected)
    expect(namesOf(assets, [payout('asset-3', 90000)])).toEqual(expected)
    expect(namesOf(assets, [payout('asset-3', 90000), payout('asset-1', 1)])).toEqual(expected)
  })
})

describe('summarizeYearlyIncome', () => {
  function paidOn(assetId: string, payoutDate: string, amountCents: number): InvestmentIncomeEntry {
    return { ...payout(assetId, amountCents), id: `entry-${payoutDate}-${amountCents}`, payoutDate }
  }

  it('sums every asset’s payouts of a year into one total', () => {
    const years = summarizeYearlyIncome(
      [vanguard, flat],
      [paidOn('asset-1', '2025-03-01', 1000), paidOn('asset-2', '2025-11-30', 550)],
    )

    expect(years).toEqual([{ year: 2025, totalCents: 1550 }])
  })

  it('gives each year its own total, oldest first', () => {
    const years = summarizeYearlyIncome(
      [vanguard],
      [
        paidOn('asset-1', '2026-01-15', 300),
        paidOn('asset-1', '2024-06-01', 100),
        paidOn('asset-1', '2025-06-01', 200),
      ],
    )

    expect(years).toEqual([
      { year: 2024, totalCents: 100 },
      { year: 2025, totalCents: 200 },
      { year: 2026, totalCents: 300 },
    ])
  })

  it('keeps a year without payouts at zero rather than skipping it', () => {
    const years = summarizeYearlyIncome(
      [vanguard],
      [paidOn('asset-1', '2022-05-01', 100), paidOn('asset-1', '2024-05-01', 100)],
    )

    expect(years.map((row) => row.year)).toEqual([2022, 2023, 2024])
    expect(years[1]?.totalCents).toBe(0)
  })

  it('files a payout under its calendar year, never shifted across New Year', () => {
    const years = summarizeYearlyIncome(
      [vanguard],
      [paidOn('asset-1', '2024-12-31', 100), paidOn('asset-1', '2025-01-01', 200)],
    )

    expect(years).toEqual([
      { year: 2024, totalCents: 100 },
      { year: 2025, totalCents: 200 },
    ])
  })

  it('adds cents exactly, never drifting through a rounded value', () => {
    const cents = Array.from({ length: 10 }, () => paidOn('asset-1', '2025-01-01', 1))

    expect(summarizeYearlyIncome([vanguard], cents)).toEqual([{ year: 2025, totalCents: 10 }])
  })

  it('counts a payout of an asset that is not the caller’s towards nothing', () => {
    const years = summarizeYearlyIncome(
      [vanguard],
      [paidOn('asset-1', '2025-01-01', 100), paidOn('asset-gone', '2020-01-01', 9900)],
    )

    expect(years).toEqual([{ year: 2025, totalCents: 100 }])
  })

  it('has nothing to show before the first payout', () => {
    expect(summarizeYearlyIncome([vanguard], [])).toEqual([])
    expect(summarizeYearlyIncome([], [paidOn('asset-1', '2025-01-01', 100)])).toEqual([])
  })
})
