import type { NetworthEntry } from './types'

export function compareEntries(a: NetworthEntry, b: NetworthEntry): number {
  return b.month.localeCompare(a.month) || a.position - b.position
}
