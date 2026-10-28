import { findEntryCategoryEmoji, findEntryCategoryName } from '../shared/entry-categories'
import { findLocationName } from '../shared/locations'

export function formatEur(cents?: number): string {
  if (cents === undefined) return ''

  const euros = Math.trunc(cents / 100).toLocaleString('de-DE')
  return `${euros},${String(cents % 100).padStart(2, '0')} €`
}

export function formatPurchaseDate(date?: string): string {
  if (date === undefined) return ''

  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year}`
}

export function formatLocation(locationId: string): string {
  return findLocationName(locationId)
}

export function formatEntryCategory(categoryId: string): string {
  return findEntryCategoryName(categoryId)
}

export function formatEntryCategoryEmoji(categoryId: string): string | undefined {
  return findEntryCategoryEmoji(categoryId)
}
