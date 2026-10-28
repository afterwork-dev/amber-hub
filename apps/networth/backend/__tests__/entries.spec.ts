import { describe, it, expect, vi } from 'vitest'
import type { AppManager, AppStorage, StoredRecord } from '@amber-hub/app-sdk/backend'
import { addEntries, deleteMonth, listEntries, saveMonth } from '../entries'

const caller = { id: 'id-ada', username: 'ada' }

function record(overrides: Partial<StoredRecord> = {}): StoredRecord {
  return {
    id: 'entry-1',
    userId: 'id-ada',
    month: '2026-09',
    position: 0,
    name: 'Main Account',
    category: 'cash',
    amountCents: 120000,
    quantity: 1,
    createdAt: '2026-09-30T10:00:00.000Z',
    ...overrides,
  }
}

function createAppManager(queryResult: StoredRecord[] = []) {
  let nextId = 1
  const storage = {
    store: vi.fn(async (_collection: string, entry: Record<string, unknown>) => ({
      id: `new-${nextId++}`,
      ...entry,
    })),
    query: vi.fn(async () => queryResult),
    remove: vi.fn(async () => undefined),
  }
  return {
    storage: storage as unknown as AppStorage,
    registerRoute: vi.fn(),
    registerTool: vi.fn(),
    mock: storage,
  } as unknown as AppManager & { mock: typeof storage }
}

const input = { name: 'Gold 5g', category: 'commodities', amountCents: 50000, quantity: 3 }

describe('listEntries', () => {
  it('asks only for the caller’s entries', async () => {
    const appManager = createAppManager()
    await listEntries(appManager, caller)

    expect(appManager.mock.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })

  it('orders by month, newest first, then by position', async () => {
    const appManager = createAppManager([
      record({ id: 'a', month: '2026-08', position: 0 }),
      record({ id: 'b', month: '2026-09', position: 1 }),
      record({ id: 'c', month: '2026-09', position: 0 }),
    ])

    const entries = await listEntries(appManager, caller)

    expect(entries.map((entry) => entry.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('saveMonth', () => {
  it('inserts new entries for the caller, with month and position', async () => {
    const appManager = createAppManager()

    const stored = await saveMonth(appManager, caller, { month: '2026-09' }, { entries: [input] })

    expect(appManager.mock.query).toHaveBeenCalledWith('entries', {
      userId: 'id-ada',
      month: '2026-09',
    })
    expect(appManager.mock.store).toHaveBeenCalledWith('entries', {
      ...input,
      month: '2026-09',
      position: 0,
      userId: 'id-ada',
      createdAt: expect.any(String),
    })
    expect(stored).toHaveLength(1)
  })

  it('replaces an existing entry, keeping when it was created', async () => {
    const appManager = createAppManager([record()])

    await saveMonth(
      appManager,
      caller,
      { month: '2026-09' },
      { entries: [{ ...input, id: 'entry-1' }] },
    )

    expect(appManager.mock.store.mock.calls[0]?.[1]).toMatchObject({
      id: 'entry-1',
      createdAt: '2026-09-30T10:00:00.000Z',
    })
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('removes the month’s entries that are no longer listed', async () => {
    const appManager = createAppManager([record({ id: 'keep' }), record({ id: 'drop' })])

    await saveMonth(
      appManager,
      caller,
      { month: '2026-09' },
      { entries: [{ ...input, id: 'keep' }, input] },
    )

    expect(appManager.mock.remove).toHaveBeenCalledTimes(1)
    expect(appManager.mock.remove).toHaveBeenCalledWith('entries', 'drop')
    expect(appManager.mock.store.mock.calls[1]?.[1]).toMatchObject({ position: 1 })
  })

  it('converges when a request is retried after a partial failure', async () => {
    const leftover = record({ id: 'new-from-failed-attempt', name: 'Gold 5g' })
    const appManager = createAppManager([record({ id: 'entry-1' }), leftover])

    await saveMonth(
      appManager,
      caller,
      { month: '2026-09' },
      { entries: [{ ...input, id: 'entry-1' }, input] },
    )

    expect(appManager.mock.remove).toHaveBeenCalledWith('entries', 'new-from-failed-attempt')
    expect(appManager.mock.store).toHaveBeenCalledTimes(2)
  })

  it('rejects an id that is not one of the caller’s entries in that month, before writing', async () => {
    const appManager = createAppManager([record()])

    await expect(
      saveMonth(appManager, caller, { month: '2026-09' }, { entries: [{ ...input, id: 'other' }] }),
    ).rejects.toThrow(/not one of your entries/)
    expect(appManager.mock.store).not.toHaveBeenCalled()
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('rejects the same id listed twice', async () => {
    const appManager = createAppManager([record()])
    const twice = {
      entries: [
        { ...input, id: 'entry-1' },
        { ...input, id: 'entry-1' },
      ],
    }

    await expect(saveMonth(appManager, caller, { month: '2026-09' }, twice)).rejects.toThrow(
      /more than once/,
    )
    expect(appManager.mock.store).not.toHaveBeenCalled()
  })

  it('rejects an invalid month or body without touching storage', async () => {
    const appManager = createAppManager()

    await expect(saveMonth(appManager, caller, {}, { entries: [input] })).rejects.toThrow()
    await expect(saveMonth(appManager, caller, { month: '2026-09' }, {})).rejects.toThrow()
    expect(appManager.mock.query).not.toHaveBeenCalled()
  })

  it('reports a removal that failed', async () => {
    const appManager = createAppManager([record({ id: 'drop' })])
    appManager.mock.remove.mockRejectedValueOnce(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(
      saveMonth(appManager, caller, { month: '2026-09' }, { entries: [input] }),
    ).rejects.toThrow(/could be removed/)
  })

  it('lets a storage failure propagate', async () => {
    const appManager = createAppManager()
    appManager.mock.store.mockRejectedValueOnce(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(
      saveMonth(appManager, caller, { month: '2026-09' }, { entries: [input] }),
    ).rejects.toThrow('APP_STORAGE_UNAVAILABLE')
  })
})

describe('deleteMonth', () => {
  it('removes every entry the caller has in that month', async () => {
    const appManager = createAppManager([record({ id: 'a' }), record({ id: 'b' })])

    const result = await deleteMonth(appManager, caller, { month: '2026-09' })

    expect(result).toEqual({ month: '2026-09' })
    expect(appManager.mock.query).toHaveBeenCalledWith('entries', {
      userId: 'id-ada',
      month: '2026-09',
    })
    expect(appManager.mock.remove.mock.calls).toEqual([
      ['entries', 'a'],
      ['entries', 'b'],
    ])
  })

  it('succeeds when the month is already gone', async () => {
    const appManager = createAppManager([])

    await expect(deleteMonth(appManager, caller, { month: '2026-09' })).resolves.toEqual({
      month: '2026-09',
    })
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('rejects an invalid month', async () => {
    await expect(deleteMonth(createAppManager(), caller, { month: 'x' })).rejects.toThrow()
  })
})

describe('addEntries', () => {
  const savings = { name: 'Savings', category: 'cash' as const, amountCents: 500000, quantity: 1 }

  it('starts a new month with the given entries', async () => {
    const appManager = createAppManager([record({ month: '2026-09', name: 'Main Account' })])

    const added = await addEntries(appManager, caller, '2026-10', [savings])

    expect(appManager.mock.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
    expect(appManager.mock.store).toHaveBeenCalledTimes(1)
    expect(appManager.mock.store.mock.calls[0]?.[1]).toMatchObject({
      ...savings,
      month: '2026-10',
      position: 0,
      userId: 'id-ada',
    })
    expect(appManager.mock.remove).not.toHaveBeenCalled()
    expect(added.month).toBe('2026-10')
    expect(added.missingFromPreviousMonth).toEqual(['Main Account'])
  })

  it('updates entries of the month by name and leaves the others alone', async () => {
    const appManager = createAppManager([
      record({ id: 'main', month: '2026-10', position: 0, name: 'Main Account' }),
      record({ id: 'gold', month: '2026-10', position: 1, name: 'Gold', category: 'commodities' }),
    ])

    await addEntries(appManager, caller, '2026-10', [
      { name: 'Main Account', category: 'cash', amountCents: 150000, quantity: 1 },
    ])

    expect(appManager.mock.store.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ id: 'main', amountCents: 150000, position: 0 }),
      expect.objectContaining({ id: 'gold', amountCents: 120000, position: 1 }),
    ])
    expect(appManager.mock.remove).not.toHaveBeenCalled()
  })

  it('compares against the latest earlier month only', async () => {
    const appManager = createAppManager([
      record({ month: '2026-11', name: 'Later' }),
      record({ month: '2026-09', name: 'Stocks' }),
      record({ month: '2026-08', name: 'Old' }),
    ])

    const added = await addEntries(appManager, caller, '2026-10', [savings])

    expect(added.missingFromPreviousMonth).toEqual(['Stocks'])
  })

  it('rejects a future month or invalid entries before touching storage', async () => {
    const appManager = createAppManager()

    await expect(addEntries(appManager, caller, '2999-01', [savings])).rejects.toThrow(/YYYY-MM/)
    await expect(addEntries(appManager, caller, '2026-10', [])).rejects.toThrow(/1 to 100/)
    await expect(
      addEntries(appManager, caller, '2026-10', [{ ...savings, name: ' ' }]),
    ).rejects.toThrow(/name/)
    expect(appManager.mock.query).not.toHaveBeenCalled()
  })
})
