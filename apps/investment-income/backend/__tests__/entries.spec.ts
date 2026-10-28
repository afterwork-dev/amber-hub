import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppManager, AppStorage, StoredRecord } from '@amber-hub/app-sdk/backend'
import { createEntry, listAssets, listEntries } from '../entries'

const caller = { id: 'id-ada', username: 'ada' }
const other = { id: 'id-bob', username: 'bob' }
const valid = { payoutDate: '2026-09-10', amountCents: 1250, assetId: 'asset-1' }

const ownedAsset: StoredRecord = {
  id: 'asset-1',
  userId: 'id-ada',
  name: 'Vanguard FTSE All-World',
  createdAt: '2026-09-12T10:14:05.213Z',
}

function createAppManager(queryResults: StoredRecord[][] = [[ownedAsset]]) {
  const pending = [...queryResults]
  const storage = {
    store: vi.fn(async (_collection: string, record: object) => ({ id: 'entry-1', ...record })),
    query: vi.fn(async () => pending.shift() ?? []),
    remove: vi.fn(async () => undefined),
  }

  return {
    storage: storage as unknown as AppStorage,
    registerRoute: vi.fn(),
    registerTool: vi.fn(),
    mock: storage,
  } as unknown as AppManager & { mock: { store: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn> } }
}

let appManager: ReturnType<typeof createAppManager>

beforeEach(() => {
  appManager = createAppManager()
})

describe('createEntry', () => {
  it('stores the entry once in the entries collection', async () => {
    await createEntry(appManager, caller, valid)

    expect(appManager.mock.store).toHaveBeenCalledTimes(1)
    expect(appManager.mock.store.mock.calls[0]?.[0]).toBe('entries')
  })

  it('takes the owner from the caller, never from the body', async () => {
    const stored = await createEntry(appManager, caller, valid)

    expect(stored.userId).toBe('id-ada')
    expect(appManager.mock.store.mock.calls[0]?.[1]).toMatchObject({ userId: 'id-ada' })
  })

  it('stamps the creation time', async () => {
    const stored = await createEntry(appManager, caller, valid)

    expect(String(stored.createdAt)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('keeps the three entry fields as given', async () => {
    const stored = await createEntry(appManager, caller, valid)

    expect(stored).toMatchObject(valid)
  })

  it('checks the asset against the caller before storing', async () => {
    await createEntry(appManager, caller, valid)

    expect(appManager.mock.query).toHaveBeenCalledWith('assets', {
      userId: 'id-ada',
      id: 'asset-1',
    })
  })

  it('stores nothing when the asset belongs to someone else or does not exist', async () => {
    appManager = createAppManager([[]])

    await expect(createEntry(appManager, other, valid)).rejects.toThrow(/not one of your assets/)
    expect(appManager.mock.store).not.toHaveBeenCalled()
  })

  it('stores nothing when the body is invalid', async () => {
    await expect(createEntry(appManager, caller, { ...valid, amountCents: 0 })).rejects.toThrow()
    await expect(createEntry(appManager, caller, { name: 'Krugerrand' })).rejects.toThrow()
    expect(appManager.mock.store).not.toHaveBeenCalled()
  })

  it('does not even look up the asset when the body is invalid', async () => {
    await expect(createEntry(appManager, caller, null)).rejects.toThrow()

    expect(appManager.mock.query).not.toHaveBeenCalled()
  })

  it('propagates a storage failure rather than reporting a phantom save', async () => {
    appManager.mock.store.mockRejectedValueOnce(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(createEntry(appManager, caller, valid)).rejects.toThrow('APP_STORAGE_UNAVAILABLE')
  })
})

describe('listEntries', () => {
  const entry = (id: string, payoutDate: string, createdAt: string): StoredRecord => ({
    id,
    userId: 'id-ada',
    payoutDate,
    amountCents: 1250,
    assetId: 'asset-1',
    createdAt,
  })

  it('asks only for the caller’s entries', async () => {
    appManager = createAppManager([[]])

    await listEntries(appManager, caller)

    expect(appManager.mock.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })

  it('returns the most recent payout first', async () => {
    appManager = createAppManager([
      [
        entry('last-month', '2026-08-13', '2026-09-13T10:00:00.000Z'),
        entry('today', '2026-09-13', '2026-09-13T09:00:00.000Z'),
        entry('last-week', '2026-09-06', '2026-09-13T11:00:00.000Z'),
      ],
    ])

    const result = await listEntries(appManager, caller)

    expect(result.map((found) => found.id)).toEqual(['today', 'last-week', 'last-month'])
  })

  it('breaks a payout-date tie with the newest recording', async () => {
    appManager = createAppManager([
      [
        entry('recorded-first', '2026-09-10', '2026-09-11T09:00:00.000Z'),
        entry('recorded-later', '2026-09-10', '2026-09-13T09:00:00.000Z'),
      ],
    ])

    const result = await listEntries(appManager, caller)

    expect(result.map((found) => found.id)).toEqual(['recorded-later', 'recorded-first'])
  })

  it('returns an empty list for a user without entries', async () => {
    appManager = createAppManager([[]])

    expect(await listEntries(appManager, caller)).toEqual([])
  })

  it('propagates a storage failure', async () => {
    appManager.mock.query.mockRejectedValueOnce(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(listEntries(appManager, caller)).rejects.toThrow('APP_STORAGE_UNAVAILABLE')
  })
})

describe('listAssets', () => {
  it('asks only for the caller’s assets', async () => {
    appManager = createAppManager([[]])

    await listAssets(appManager, caller)

    expect(appManager.mock.query).toHaveBeenCalledWith('assets', { userId: 'id-ada' })
  })

  it('returns the newest asset first', async () => {
    appManager = createAppManager([
      [
        { ...ownedAsset, id: 'older', createdAt: '2026-09-11T08:02:44.900Z' },
        { ...ownedAsset, id: 'newer', createdAt: '2026-09-12T10:14:05.213Z' },
      ],
    ])

    const result = await listAssets(appManager, caller)

    expect(result.map((found) => found.id)).toEqual(['newer', 'older'])
  })

  it('returns an empty list for a user without assets', async () => {
    appManager = createAppManager([[]])

    expect(await listAssets(appManager, caller)).toEqual([])
  })
})
