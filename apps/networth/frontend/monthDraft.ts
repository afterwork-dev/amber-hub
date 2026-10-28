import type { Category } from '../shared/categories'
import { monthOf, nextMonth } from '../shared/entryMonth'
import { entryValueCents } from '../shared/entryValue'
import type { MonthEntryInput, NetworthEntry } from '../shared/types'
import { formatAmountInput, formatQuantityInput } from './formatEur'
import { parseEurInput } from './parseEurInput'
import { parseQuantityInput } from './parseQuantityInput'

export interface DraftRow {
  /** Stable key for rendering, never sent to the backend */
  key: number
  id?: string
  name: string
  category: Category | null
  amount: string
  quantity: string
}

const YEARS_BACK = 10

let lastKey = 0

export function emptyRow(): DraftRow {
  return { key: ++lastKey, name: '', category: null, amount: '', quantity: '1' }
}

function rowFrom(entry: NetworthEntry, amount: string): DraftRow {
  return {
    ...emptyRow(),
    name: entry.name,
    category: entry.category,
    amount,
    quantity: formatQuantityInput(entry.quantity),
  }
}

export function prefillRows(entries: NetworthEntry[]): DraftRow[] {
  return entries.map((entry) => rowFrom(entry, ''))
}

export function editRows(entries: NetworthEntry[]): DraftRow[] {
  return entries.map((entry) => ({
    ...rowFrom(entry, formatAmountInput(entry.amountCents)),
    id: entry.id,
  }))
}

export function defaultNewMonth(latestMonth: string | undefined, today = new Date()): string {
  const current = monthOf(today)
  if (latestMonth === undefined) return current

  const following = nextMonth(latestMonth)
  return following < current ? following : current
}

export function yearOptions(recordedMonths: string[], today = new Date()): number[] {
  const current = today.getFullYear()
  const earliest = Math.min(
    current - YEARS_BACK,
    ...recordedMonths.map((month) => Number(month.slice(0, 4))),
  )

  return Array.from({ length: current - earliest + 1 }, (_, index) => current - index)
}

export function monthFrom(year: number, monthNumber: number): string {
  return `${year}-${String(monthNumber).padStart(2, '0')}`
}

export function rowValueCents(row: Pick<DraftRow, 'amount' | 'quantity'>): number | null {
  const amount = parseEurInput(row.amount)
  const quantity = parseQuantityInput(row.quantity)
  if (!amount.valid || amount.cents === undefined || quantity === null) return null

  return entryValueCents({ amountCents: amount.cents, quantity })
}

export function toMonthEntry(row: DraftRow): MonthEntryInput | null {
  const amount = parseEurInput(row.amount)
  const quantity = parseQuantityInput(row.quantity)
  if (!amount.valid || amount.cents === undefined || quantity === null || !row.category) {
    return null
  }

  return {
    ...(row.id === undefined ? {} : { id: row.id }),
    name: row.name.trim(),
    category: row.category,
    amountCents: amount.cents,
    quantity,
  }
}
