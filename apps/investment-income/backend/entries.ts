import type { AppManager, StoredRecord } from '@amber-hub/app-sdk/backend'
import { compareEntries } from '../shared/entryOrder'
import type { InvestmentIncomeAsset, InvestmentIncomeEntry } from '../shared/types'
import { reject } from './validation'
import { validateNewEntry } from './validateNewEntry'

export const ENTRIES_COLLECTION = 'entries'
export const ASSETS_COLLECTION = 'assets'

export interface Caller {
  id: string
  username: string
}

/** Storage hands back untyped records; this app is the only writer, so it knows their shape. */
function as<T>(records: StoredRecord[]): T[] {
  return records as unknown as T[]
}

export async function createEntry(
  appManager: AppManager,
  caller: Caller,
  body: unknown,
): Promise<StoredRecord> {
  const entry = validateNewEntry(body)

  const owned = await appManager.storage.query(ASSETS_COLLECTION, {
    userId: caller.id,
    id: entry.assetId,
  })
  if (owned.length === 0) reject('assetId is not one of your assets')

  return appManager.storage.store(ENTRIES_COLLECTION, {
    ...entry,
    userId: caller.id,
    createdAt: new Date().toISOString(),
  })
}

export async function listEntries(
  appManager: AppManager,
  caller: Caller,
): Promise<InvestmentIncomeEntry[]> {
  const entries = await appManager.storage.query(ENTRIES_COLLECTION, { userId: caller.id })

  return as<InvestmentIncomeEntry>(entries).sort(compareEntries)
}

export async function listAssets(
  appManager: AppManager,
  caller: Caller,
): Promise<InvestmentIncomeAsset[]> {
  const assets = await appManager.storage.query(ASSETS_COLLECTION, { userId: caller.id })

  return as<InvestmentIncomeAsset>(assets).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
