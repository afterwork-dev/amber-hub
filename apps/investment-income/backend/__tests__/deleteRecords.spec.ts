import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppManager, AppStorage, StoredRecord } from '@amber-hub/app-sdk/backend'
import { deleteAsset, deleteEntry } from '../deleteRecords'

const caller = { id: 'id-ada', username: 'ada' }

const ownEntry: StoredRecord = {
  id: 'entry-1',
  userId: 'id-ada',
  payoutDate: '2026-09-10',
  amountCents: 1250,
  assetId: 'asset-1',
  createdAt: '2026-09-13T09:41:12.008Z',
}

const otherUsersEntry: StoredRecord = { ...ownEntry, userId: 'id-bob' }

function createAppManager(found: StoredRecord[] = [ownEntry]) {
  const storage = {
    store: vi.fn(async () => ({ id: 'unused' })),
    query: vi.fn(async () => found),
    remove: vi.fn(async () => undefined),
  }

  return {
    storage: storage as unknown as AppStorage,
    registerRoute: vi.fn(),
    registerTool: vi.fn(),
    mock: storage,
  } as unknown as AppManager & { mock: typeof storage }
}

let appManager: ReturnType<typeof createAppManager>

beforeEach(() => {
  appManager = createAppManager()
})

describe('deleteEntry — resolving the record', () => {
  it('looks the entry up by its id alone, so an unknown id is distinguishable', async () => {
    await deleteEntry(appManager, caller, { id: 'entry-1' })

    expect(appManager.mock.query).toHaveBeenCalledWith('entries', { id: 'entry-1' })
  })

  it('refuses a request with no id and deletes nothing', async () => {
    await expect(deleteEntry(appManager, caller, {})).rejects.toThrow()

    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('refuses a blank id and deletes nothing', async () => {
    await expect(deleteEntry(appManager, caller, { id: '   ' })).rejects.toThrow()

    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('treats an id that matches nothing as already deleted, removing nothing', async () => {
    appManager = createAppManager([])

    await expect(deleteEntry(appManager, caller, { id: 'gone' })).resolves.toEqual({ id: 'gone' })
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('refuses another user’s entry rather than reporting it as already gone', async () => {
    appManager = createAppManager([otherUsersEntry])

    await expect(deleteEntry(appManager, caller, { id: 'entry-1' })).rejects.toThrow()
  })

  it('leaves another user’s entry in place', async () => {
    appManager = createAppManager([otherUsersEntry])

    await expect(deleteEntry(appManager, caller, { id: 'entry-1' })).rejects.toThrow()
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })
})

describe('deleteEntry — removing the record', () => {
  it('removes the caller’s own entry from the entries collection', async () => {
    await deleteEntry(appManager, caller, { id: 'entry-1' })

    expect(appManager.mock.remove).toHaveBeenCalledTimes(1)
    expect(appManager.mock.remove).toHaveBeenCalledWith('entries', 'entry-1')
  })

  it('answers with the id it deleted', async () => {
    await expect(deleteEntry(appManager, caller, { id: 'entry-1' })).resolves.toEqual({
      id: 'entry-1',
    })
  })

  it('never touches the asset the entry belonged to', async () => {
    await deleteEntry(appManager, caller, { id: 'entry-1' })

    expect(appManager.mock.query).toHaveBeenCalledTimes(1)
    expect(appManager.mock.query).toHaveBeenCalledWith('entries', { id: 'entry-1' })
    expect(appManager.mock.remove).toHaveBeenCalledTimes(1)
    expect(appManager.mock.remove).toHaveBeenCalledWith('entries', 'entry-1')
  })

  it('stores nothing: a deletion is not a write', async () => {
    await deleteEntry(appManager, caller, { id: 'entry-1' })

    expect(appManager.mock.store).not.toHaveBeenCalled()
  })

  it('surfaces a storage failure instead of claiming success', async () => {
    appManager.mock.remove.mockRejectedValueOnce(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(deleteEntry(appManager, caller, { id: 'entry-1' })).rejects.toThrow()
  })
})

describe('deleteAsset', () => {
  const ownAsset: StoredRecord = {
    id: 'asset-1',
    userId: 'id-ada',
    name: 'Vanguard FTSE All-World',
    createdAt: '2026-09-12T10:14:05.213Z',
  }
  const entryA: StoredRecord = { ...ownEntry, id: 'entry-a' }
  const entryB: StoredRecord = { ...ownEntry, id: 'entry-b' }

  function assetManager(asset: StoredRecord[], entries: StoredRecord[]) {
    const manager = createAppManager()
    manager.mock.query.mockImplementation((async (collection: string) =>
      collection === 'assets' ? asset : entries) as never)
    return manager
  }

  it('finds the entries by owner and asset', async () => {
    appManager = assetManager([ownAsset], [entryA])

    await deleteAsset(appManager, caller, { id: 'asset-1' })

    expect(appManager.mock.query).toHaveBeenCalledWith('entries', {
      userId: 'id-ada',
      assetId: 'asset-1',
    })
  })

  it('removes every entry before the asset', async () => {
    appManager = assetManager([ownAsset], [entryA, entryB])

    await expect(deleteAsset(appManager, caller, { id: 'asset-1' })).resolves.toEqual({
      id: 'asset-1',
    })

    expect(appManager.mock.remove.mock.calls).toEqual([
      ['entries', 'entry-a'],
      ['entries', 'entry-b'],
      ['assets', 'asset-1'],
    ])
  })

  it('keeps the asset when an entry cannot be removed', async () => {
    appManager = assetManager([ownAsset], [entryA, entryB])
    appManager.mock.remove.mockImplementation((async (collection: string, id: string) => {
      if (id === 'entry-a') throw new Error('APP_STORAGE_UNAVAILABLE')
    }) as never)

    await expect(deleteAsset(appManager, caller, { id: 'asset-1' })).rejects.toThrow()

    expect(appManager.mock.remove).not.toHaveBeenCalledWith('assets', 'asset-1')
    expect(appManager.mock.remove).toHaveBeenCalledWith('entries', 'entry-b')
  })

  it('only attempts the entries still stored when it is run again', async () => {
    appManager = assetManager([ownAsset], [entryB])

    await deleteAsset(appManager, caller, { id: 'asset-1' })

    expect(appManager.mock.remove.mock.calls).toEqual([
      ['entries', 'entry-b'],
      ['assets', 'asset-1'],
    ])
  })

  it('refuses another user’s asset and removes nothing', async () => {
    appManager = assetManager([{ ...ownAsset, userId: 'id-bob' }], [entryA])

    await expect(deleteAsset(appManager, caller, { id: 'asset-1' })).rejects.toThrow()

    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('treats an unknown asset as already deleted', async () => {
    appManager = assetManager([], [])

    await expect(deleteAsset(appManager, caller, { id: 'gone' })).resolves.toEqual({ id: 'gone' })
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('removes just the asset when it has no entries', async () => {
    appManager = assetManager([ownAsset], [])

    await deleteAsset(appManager, caller, { id: 'asset-1' })

    expect(appManager.mock.remove.mock.calls).toEqual([['assets', 'asset-1']])
  })
})
