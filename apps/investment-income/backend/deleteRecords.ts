import type { AppManager, StoredRecord } from '@amber-hub/app-sdk/backend'
import { ASSETS_COLLECTION, ENTRIES_COLLECTION, type Caller } from './entries'
import { reject } from './validation'

function requireId(query: Record<string, string>): string {
  const id = query.id
  if (typeof id !== 'string' || id.trim() === '') reject('id must name a record')
  return id
}

/**
 * Null when nothing has this id: the record is already gone and a delete has nothing left to do.
 * Another user's record is refused instead, so a failed guess never reads as success.
 */
async function resolveOwn(
  appManager: AppManager,
  collection: string,
  caller: Caller,
  id: string,
): Promise<StoredRecord | null> {
  const [record] = await appManager.storage.query(collection, { id })
  if (!record) return null
  if (record.userId !== caller.id) reject('id is not one of your records')

  return record
}

export async function deleteEntry(
  appManager: AppManager,
  caller: Caller,
  query: Record<string, string>,
): Promise<{ id: string }> {
  const id = requireId(query)
  const entry = await resolveOwn(appManager, ENTRIES_COLLECTION, caller, id)
  if (entry) await appManager.storage.remove(ENTRIES_COLLECTION, id)

  return { id }
}

/**
 * Entries go first so the only state a failure can leave is an asset with fewer entries, whose
 * total still agrees with them. A retry re-queries, so it never replays ids already removed.
 */
export async function deleteAsset(
  appManager: AppManager,
  caller: Caller,
  query: Record<string, string>,
): Promise<{ id: string }> {
  const id = requireId(query)
  const asset = await resolveOwn(appManager, ASSETS_COLLECTION, caller, id)
  if (!asset) return { id }

  const entries = await appManager.storage.query(ENTRIES_COLLECTION, {
    userId: caller.id,
    assetId: id,
  })
  const results = await Promise.allSettled(
    entries.map((entry) => appManager.storage.remove(ENTRIES_COLLECTION, entry.id)),
  )
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('not every transaction of the asset could be removed')
  }

  await appManager.storage.remove(ASSETS_COLLECTION, id)

  return { id }
}
