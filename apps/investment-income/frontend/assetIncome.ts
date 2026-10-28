import type { InvestmentIncomeAsset, InvestmentIncomeEntry } from '../shared/types'
import { compareAssetNames } from './assetOrder'

export interface AssetIncomeSummary {
  assetId: string
  name: string
  totalCents: number
}

function compareSummaries(a: AssetIncomeSummary, b: AssetIncomeSummary): number {
  const byName = compareAssetNames(a.name, b.name)
  return byName !== 0 ? byName : a.assetId.localeCompare(b.assetId)
}

/** Integer cents throughout, so the total stays exact however many payouts it sums. */
export function summarizeAssetIncome(
  assets: InvestmentIncomeAsset[],
  entries: InvestmentIncomeEntry[],
): AssetIncomeSummary[] {
  const totals = new Map<string, number>()

  for (const entry of entries) {
    totals.set(entry.assetId, (totals.get(entry.assetId) ?? 0) + entry.amountCents)
  }

  return assets
    .map((asset) => ({
      assetId: asset.id,
      name: asset.name,
      totalCents: totals.get(asset.id) ?? 0,
    }))
    .sort(compareSummaries)
}

export interface YearlyIncome {
  year: number
  totalCents: number
}

/**
 * One row per calendar year from the first payout to the last, in chronological order. A year in
 * between that paid nothing is kept at zero, so the chart's axis never skips a year. Only payouts
 * of the caller's own assets count, matching the cards.
 */
export function summarizeYearlyIncome(
  assets: InvestmentIncomeAsset[],
  entries: InvestmentIncomeEntry[],
): YearlyIncome[] {
  const owned = new Set(assets.map((asset) => asset.id))
  const totals = new Map<number, number>()

  for (const entry of entries) {
    if (!owned.has(entry.assetId)) continue

    // `payoutDate` is `YYYY-MM-DD`; a Date would shift it across a year boundary in some timezones.
    const year = Number(entry.payoutDate.slice(0, 4))
    totals.set(year, (totals.get(year) ?? 0) + entry.amountCents)
  }

  if (totals.size === 0) return []

  const years = [...totals.keys()]
  const first = Math.min(...years)
  const last = Math.max(...years)

  return Array.from({ length: last - first + 1 }, (_, index) => {
    const year = first + index
    return { year, totalCents: totals.get(year) ?? 0 }
  })
}
