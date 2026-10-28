import type { AppManager, StoredRecord } from '@amber-hub/app-sdk/backend'
import { validateNewEntry } from './validateNewEntry'

const ENTRIES_COLLECTION = 'entries'

interface Caller {
  id: string
}

export async function createEntry(
  appManager: AppManager,
  caller: Caller,
  body: unknown,
): Promise<StoredRecord> {
  const entry = validateNewEntry(body)

  return appManager.storage.store(ENTRIES_COLLECTION, {
    ...entry,
    userId: caller.id,
    createdAt: new Date().toISOString(),
  })
}

export async function listEntries(
  appManager: AppManager,
  caller: Caller,
  limit?: number,
): Promise<StoredRecord[]> {
  const entries = await appManager.storage.query(ENTRIES_COLLECTION, { userId: caller.id })
  const newestFirst = entries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  return limit === undefined ? newestFirst : newestFirst.slice(0, limit)
}
