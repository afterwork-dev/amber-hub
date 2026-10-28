import { CATEGORIES, type Category } from '../shared/categories'
import { entryValueCents } from '../shared/entryValue'
import { totalsOf, type Totals } from '../shared/totals'
import type { NetworthEntry } from '../shared/types'

export interface MonthSummary extends Totals {
  month: string
}

export interface CategoryTotal {
  category: Category
  title: string
  valueCents: number
}

export function entriesOf(entries: NetworthEntry[], month: string): NetworthEntry[] {
  return entries.filter((entry) => entry.month === month)
}

export function summarizeMonths(entries: NetworthEntry[]): MonthSummary[] {
  const months = [...new Set(entries.map((entry) => entry.month))].sort().reverse()

  return months.map((month) => ({
    month,
    ...totalsOf(entriesOf(entries, month).map(entryValueCents)),
  }))
}

export function categoryTotals(entries: NetworthEntry[]): CategoryTotal[] {
  return CATEGORIES.map(({ value, title }) => ({
    category: value,
    title,
    valueCents: totalsOf(entries.filter((entry) => entry.category === value).map(entryValueCents))
      .assetsCents,
  })).filter((total) => total.valueCents > 0)
}
