import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NetworthEntry } from '../../shared/types'
import { entryFactory } from './entryFactory'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useEntryList } = await import('../useEntryList')

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useEntryList', () => {
  it('asks the backend for the entries and keeps them', async () => {
    const entries = [entryFactory()]
    callAppApi.mockResolvedValue({ entries })
    const list = useEntryList()

    await list.loadEntries()

    expect(callAppApi).toHaveBeenCalledWith('networth', 'GET', '/entries')
    expect(list.entries.value).toEqual(entries)
  })

  it('reports that a load is in flight, then that it is done', async () => {
    let release: (result: { entries: NetworthEntry[] }) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { loading, loadEntries } = useEntryList()

    const pending = loadEntries()
    expect(loading.value).toBe(true)

    release({ entries: [] })
    await pending
    expect(loading.value).toBe(false)
  })

  it('reports a failed load in words a user can act on', async () => {
    callAppApi.mockRejectedValue(new Error('APP_BACKEND_HANDLER_ERROR'))
    const { error, loadEntries } = useEntryList()

    await loadEntries()

    expect(error.value).toBe(
      'Your net worth could not be loaded. Check your connection and try again.',
    )
  })

  it('replaces one month’s entries and keeps the order', () => {
    const { entries, replaceMonth } = useEntryList()
    const august = entryFactory({ month: '2026-08' })
    entries.value = [entryFactory({ month: '2026-09' }), august]
    const second = entryFactory({ month: '2026-09', position: 1, name: 'Savings' })
    const first = entryFactory({ month: '2026-09', position: 0, name: 'Gold' })

    replaceMonth('2026-09', [second, first])

    expect(entries.value).toEqual([first, second, august])
  })

  it('removes a month', () => {
    const { entries, removeMonth } = useEntryList()
    const august = entryFactory({ month: '2026-08' })
    entries.value = [entryFactory({ month: '2026-09' }), august]

    removeMonth('2026-09')

    expect(entries.value).toEqual([august])
  })
})
