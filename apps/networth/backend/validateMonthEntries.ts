import { MAX_ENTRIES_PER_MONTH, MAX_NAME_LENGTH } from '../shared/entry-limits'
import type { MonthEntryInput } from '../shared/types'
import {
  reject,
  requireAmountCents,
  requireCategory,
  requireKnownFieldsOnly,
  requireQuantity,
  requireText,
} from './validation'

const ENTRY_FIELDS = ['id', 'name', 'category', 'amountCents', 'quantity']

function validateEntry(value: unknown): MonthEntryInput {
  const source = requireKnownFieldsOnly(value, ENTRY_FIELDS)
  const entry: MonthEntryInput = {
    name: requireText(source.name, 'name', MAX_NAME_LENGTH),
    category: requireCategory(source.category),
    amountCents: requireAmountCents(source.amountCents),
    quantity: requireQuantity(source.quantity),
  }

  if (source.id !== undefined) {
    if (typeof source.id !== 'string' || source.id === '') reject('id must name an entry')
    entry.id = source.id
  }

  return entry
}

export function validateMonthEntries(body: unknown): MonthEntryInput[] {
  const { entries } = requireKnownFieldsOnly(body, ['entries'])
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES_PER_MONTH) {
    reject(`entries must list 1 to ${MAX_ENTRIES_PER_MONTH} entries`)
  }

  return entries.map(validateEntry)
}
