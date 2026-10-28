import type { AppManager, StoredRecord } from '@amber-hub/app-sdk/backend'
import { compareEntries } from '../shared/entryOrder'
import type { MonthEntryInput, NetworthEntry } from '../shared/types'
import { mergeByName, missingNames } from './mergeEntries'
import { reject, requireMonth } from './validation'
import { validateMonthEntries } from './validateMonthEntries'

export const ENTRIES_COLLECTION = 'entries'

export interface Caller {
  id: string
  username: string
}

/** Storage hands back untyped records; this app is the only writer, so it knows their shape. */
function as<T>(records: StoredRecord[]): T[] {
  return records as unknown as T[]
}

export async function listEntries(
  appManager: AppManager,
  caller: Caller,
): Promise<NetworthEntry[]> {
  const entries = await appManager.storage.query(ENTRIES_COLLECTION, { userId: caller.id })

  return as<NetworthEntry>(entries).sort(compareEntries)
}

async function monthEntries(
  appManager: AppManager,
  caller: Caller,
  month: string,
): Promise<NetworthEntry[]> {
  return as<NetworthEntry>(
    await appManager.storage.query(ENTRIES_COLLECTION, { userId: caller.id, month }),
  )
}

function requireOwnIds(entries: MonthEntryInput[], existing: Map<string, NetworthEntry>): void {
  const seen = new Set<string>()
  for (const { id } of entries) {
    if (id === undefined) continue
    if (!existing.has(id)) reject('id is not one of your entries in this month')
    if (seen.has(id)) reject('id appears more than once')
    seen.add(id)
  }
}

async function removeAll(appManager: AppManager, entries: NetworthEntry[]): Promise<void> {
  const results = await Promise.allSettled(
    entries.map((entry) => appManager.storage.remove(ENTRIES_COLLECTION, entry.id)),
  )
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('not every entry of the month could be removed')
  }
}

async function writeMonth(
  appManager: AppManager,
  caller: Caller,
  month: string,
  entries: MonthEntryInput[],
  existingEntries: NetworthEntry[],
): Promise<NetworthEntry[]> {
  const existing = new Map(existingEntries.map((entry) => [entry.id, entry]))
  requireOwnIds(entries, existing)

  const now = new Date().toISOString()
  const stored = await Promise.all(
    entries.map((entry, position) =>
      appManager.storage.store(ENTRIES_COLLECTION, {
        ...entry,
        month,
        position,
        userId: caller.id,
        createdAt: existing.get(entry.id ?? '')?.createdAt ?? now,
      }),
    ),
  )

  const kept = new Set(entries.map((entry) => entry.id))
  await removeAll(
    appManager,
    existingEntries.filter((entry) => !kept.has(entry.id)),
  )

  return as<NetworthEntry>(stored)
}

export async function saveMonth(
  appManager: AppManager,
  caller: Caller,
  query: Record<string, string>,
  body: unknown,
): Promise<NetworthEntry[]> {
  const month = requireMonth(query.month)
  const entries = validateMonthEntries(body)

  return writeMonth(
    appManager,
    caller,
    month,
    entries,
    await monthEntries(appManager, caller, month),
  )
}

export interface AddedEntries {
  month: string
  entries: NetworthEntry[]
  /** Names recorded in the previous month that this month does not have yet */
  missingFromPreviousMonth: string[]
}

export async function addEntries(
  appManager: AppManager,
  caller: Caller,
  month: unknown,
  additions: MonthEntryInput[],
): Promise<AddedEntries> {
  const validMonth = requireMonth(month)
  const entries = validateMonthEntries({ entries: additions })
  const all = await listEntries(appManager, caller)
  const existing = all.filter((entry) => entry.month === validMonth)
  const previousMonth = all.find((entry) => entry.month < validMonth)?.month

  const stored = await writeMonth(
    appManager,
    caller,
    validMonth,
    mergeByName(existing, entries),
    existing,
  )

  return {
    month: validMonth,
    entries: stored,
    missingFromPreviousMonth: missingNames(
      all.filter((entry) => entry.month === previousMonth),
      stored,
    ),
  }
}

export async function deleteMonth(
  appManager: AppManager,
  caller: Caller,
  query: Record<string, string>,
): Promise<{ month: string }> {
  const month = requireMonth(query.month)
  await removeAll(appManager, await monthEntries(appManager, caller, month))

  return { month }
}
