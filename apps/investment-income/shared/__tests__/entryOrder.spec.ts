import { describe, it, expect } from 'vitest'
import type { InvestmentIncomeEntry } from '../types'
import { compareEntries } from '../entryOrder'

const base: InvestmentIncomeEntry = {
  id: 'entry-1',
  userId: 'user-1',
  payoutDate: '2026-09-10',
  amountCents: 1250,
  assetId: 'asset-1',
  createdAt: '2026-09-13T09:41:12.008Z',
}

const entry = (overrides: Partial<InvestmentIncomeEntry>): InvestmentIncomeEntry => ({
  ...base,
  ...overrides,
})

describe('compareEntries', () => {
  it('puts the more recent payout first', () => {
    const recent = entry({ payoutDate: '2026-09-10' })
    const older = entry({ payoutDate: '2026-06-30' })

    expect(compareEntries(recent, older)).toBeLessThan(0)
    expect(compareEntries(older, recent)).toBeGreaterThan(0)
  })

  it('ignores when an entry was recorded while payout dates differ', () => {
    const recentPayoutRecordedFirst = entry({
      payoutDate: '2026-09-10',
      createdAt: '2026-09-01T00:00:00.000Z',
    })
    const olderPayoutRecordedLater = entry({
      payoutDate: '2026-06-30',
      createdAt: '2026-09-13T00:00:00.000Z',
    })

    expect(compareEntries(recentPayoutRecordedFirst, olderPayoutRecordedLater)).toBeLessThan(0)
  })

  it('falls back to the newest recording on the same payout date', () => {
    const recorded = entry({ createdAt: '2026-09-13T09:41:12.008Z' })
    const recordedEarlier = entry({ createdAt: '2026-09-12T08:00:00.000Z' })

    expect(compareEntries(recorded, recordedEarlier)).toBeLessThan(0)
    expect(compareEntries(recordedEarlier, recorded)).toBeGreaterThan(0)
  })

  it('treats identical dates as equal', () => {
    expect(compareEntries(base, entry({ id: 'entry-2' }))).toBe(0)
  })

  it('sorts a whole list newest payout first', () => {
    const today = entry({ id: 'today', payoutDate: '2026-09-13' })
    const lastWeek = entry({ id: 'last-week', payoutDate: '2026-09-06' })
    const lastMonth = entry({ id: 'last-month', payoutDate: '2026-08-13' })

    const sorted = [lastMonth, today, lastWeek].sort(compareEntries).map((found) => found.id)

    expect(sorted).toEqual(['today', 'last-week', 'last-month'])
  })
})
