import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InvestmentIncomeEntry } from '../../shared/types'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useEntryList } = await import('../useEntryList')

const newest: InvestmentIncomeEntry = {
  id: 'entry-1',
  userId: 'user-1',
  payoutDate: '2026-09-10',
  amountCents: 1250,
  assetId: 'asset-1',
  createdAt: '2026-09-13T09:41:12.008Z',
}

const older: InvestmentIncomeEntry = { ...newest, id: 'entry-0', payoutDate: '2026-06-30' }

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

    expect(callAppApi).toHaveBeenCalledWith('investment-income', 'GET', '/entries')
  })

  it('exposes what came back', async () => {
    callAppApi.mockResolvedValue({ entries: [newest, older] })
    const { entries, loadEntries } = useEntryList()

    await loadEntries()

    expect(entries.value).toEqual([newest, older])
  })

  it('reports that a load is in flight, then that it is done', async () => {
    let release: (payload: { entries: InvestmentIncomeEntry[] }) => void = () => {}
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

  it('puts a newly added payout at the top without refetching', async () => {
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

  it('adds a back-dated payout without reordering: a total does not care', async () => {
    const middle = { ...newest, id: 'entry-middle', payoutDate: '2026-08-01' }
    callAppApi.mockResolvedValue({ entries: [newest, older] })
    const { entries, loadEntries, addEntry } = useEntryList()
    await loadEntries()

    addEntry(middle)

    expect(entries.value.map((entry) => entry.id)).toEqual(['entry-middle', 'entry-1', 'entry-0'])
  })

  it('drops exactly the deleted payout, so its asset total falls by that much', async () => {
    callAppApi.mockResolvedValue({ entries: [newest, older] })
    const { entries, loadEntries, removeEntry } = useEntryList()
    await loadEntries()
    callAppApi.mockClear()

    removeEntry('entry-1')

    expect(entries.value).toEqual([older])
    expect(callAppApi).not.toHaveBeenCalled()
  })

  it('leaves the surviving payouts in the order they were in', async () => {
    const middle = { ...newest, id: 'entry-middle', payoutDate: '2026-08-01' }
    callAppApi.mockResolvedValue({ entries: [newest, middle, older] })
    const { entries, loadEntries, removeEntry } = useEntryList()
    await loadEntries()

    removeEntry('entry-middle')

    expect(entries.value.map((entry) => entry.id)).toEqual(['entry-1', 'entry-0'])
  })

  it('can empty the list, leaving the asset with nothing', async () => {
    callAppApi.mockResolvedValue({ entries: [newest] })
    const { entries, loadEntries, removeEntry } = useEntryList()
    await loadEntries()

    removeEntry('entry-1')

    expect(entries.value).toEqual([])
  })

  it('ignores an id it does not hold, rather than dropping the wrong payout', async () => {
    callAppApi.mockResolvedValue({ entries: [newest, older] })
    const { entries, loadEntries, removeEntry } = useEntryList()
    await loadEntries()

    removeEntry('entry-never-existed')

    expect(entries.value).toEqual([newest, older])
  })

  it('keeps every entry it is given, so no payout is left out of a total', async () => {
    callAppApi.mockResolvedValue({ entries: [newest] })
    const { entries, loadEntries, addEntry } = useEntryList()
    await loadEntries()

    addEntry(older)

    expect(entries.value).toHaveLength(2)
    expect(entries.value.map((entry) => entry.id)).toContain('entry-0')
    expect(entries.value.map((entry) => entry.id)).toContain('entry-1')
  })

  it('drops every entry of one asset and no other', async () => {
    const other = { ...older, id: 'entry-x', assetId: 'asset-2' }
    callAppApi.mockResolvedValue({ entries: [newest, other, older] })
    const { entries, loadEntries, removeEntriesForAsset } = useEntryList()
    await loadEntries()

    removeEntriesForAsset('asset-1')

    expect(entries.value).toEqual([other])
  })
})
