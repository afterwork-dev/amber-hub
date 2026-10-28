import type { InvestmentIncomeEntry } from './types'

/** Newest payout first; entries paid on the same day fall back to when they were recorded. */
export function compareEntries(a: InvestmentIncomeEntry, b: InvestmentIncomeEntry): number {
  const byPayoutDate = String(b.payoutDate).localeCompare(String(a.payoutDate))
  return byPayoutDate !== 0 ? byPayoutDate : String(b.createdAt).localeCompare(String(a.createdAt))
}
