import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TreasuryEntry } from '../../shared/types'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useEntryList } = await import('../useEntryList')

const newest: TreasuryEntry = {
  id: 'entry-1',
  userId: 'user-1',
  name: 'Krugerrand',
  categoryId: 'category-gold',
  locationId: 'location-1',
  createdAt: '2026-08-12T14:03:22.147Z',
}

const older: TreasuryEntry = { ...newest, id: 'entry-0', createdAt: '2026-08-11T09:00:00.000Z' }

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useEntryList', () => {
  it('starts empty, idle, and without a complaint', () => {
    const { entries, loading, error } = useEntryList()

    expect(entries.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('asks the backend for the entries', async () => {
    callAppApi.mockResolvedValue({ entries: [] })
    const { loadEntries } = useEntryList()

    await loadEntries()

    expect(callAppApi).toHaveBeenCalledWith('treasury', 'GET', '/entries')
  })

  it('exposes what came back', async () => {
    callAppApi.mockResolvedValue({ entries: [newest, older] })
    const { entries, loadEntries } = useEntryList()

    await loadEntries()

    expect(entries.value).toEqual([newest, older])
  })

  it('reports that a load is in flight, then that it is done', async () => {
    let release: (payload: { entries: TreasuryEntry[] }) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { loading, loadEntries } = useEntryList()

    expect(loading.value).toBe(false)
    const pending = loadEntries()
    expect(loading.value).toBe(true)

    release({ entries: [] })
    await pending
    expect(loading.value).toBe(false)
  })

  it('surfaces a load failure without throwing or inventing entries', async () => {
    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    const { entries, loading, error, loadEntries } = useEntryList()

    await expect(loadEntries()).resolves.toBeUndefined()
    expect(entries.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toMatch(/try again/i)
  })

  it('keeps the failure free of transport wording', async () => {
    callAppApi.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const { error, loadEntries } = useEntryList()

    await loadEntries()

    expect(error.value).not.toMatch(/APP_STORAGE_UNAVAILABLE/)
  })

  it('clears a previous failure when a retry succeeds', async () => {
    callAppApi.mockRejectedValueOnce(new Error('storage unavailable'))
    const { error, loadEntries } = useEntryList()
    await loadEntries()
    expect(error.value).toBeTruthy()

    callAppApi.mockResolvedValue({ entries: [newest] })
    await loadEntries()

    expect(error.value).toBeNull()
  })

  it('puts an added entry at the top without refetching', async () => {
    callAppApi.mockResolvedValue({ entries: [older] })
    const { entries, loadEntries, addEntry } = useEntryList()
    await loadEntries()
    callAppApi.mockClear()

    addEntry(newest)

    expect(entries.value).toEqual([newest, older])
    expect(callAppApi).not.toHaveBeenCalled()
  })

  it('can take the first entry a user ever adds', () => {
    const { entries, addEntry } = useEntryList()

    addEntry(newest)

    expect(entries.value).toEqual([newest])
  })
})
