import { MAX_ENTRIES_PER_MONTH } from '../shared/entry-limits'
import type { MonthEntryInput, NetworthEntry } from '../shared/types'
import { reject } from './validation'

const nameKey = (name: string): string => name.trim().toLocaleLowerCase('de-DE')

export function mergeByName(
  existing: NetworthEntry[],
  additions: MonthEntryInput[],
): MonthEntryInput[] {
  const byName = new Map(additions.map((addition) => [nameKey(addition.name), addition]))
  if (byName.size !== additions.length) reject('name appears more than once')

  const updated = existing.map(({ id, name, category, amountCents, quantity }) => {
    const addition = byName.get(nameKey(name))
    return addition ? { ...addition, id, name } : { id, name, category, amountCents, quantity }
  })
  const existingNames = new Set(existing.map((entry) => nameKey(entry.name)))
  const added = additions.filter((addition) => !existingNames.has(nameKey(addition.name)))

  const merged = [...updated, ...added]
  if (merged.length > MAX_ENTRIES_PER_MONTH) {
    reject(`a month holds at most ${MAX_ENTRIES_PER_MONTH} entries`)
  }
  return merged
}

export function missingNames(previous: NetworthEntry[], current: NetworthEntry[]): string[] {
  const present = new Set(current.map((entry) => nameKey(entry.name)))

  return previous.filter((entry) => !present.has(nameKey(entry.name))).map((entry) => entry.name)
}
