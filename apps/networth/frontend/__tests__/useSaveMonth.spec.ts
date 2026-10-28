import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MonthEntryInput, NetworthEntry } from '../../shared/types'
import { entryFactory } from './entryFactory'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useSaveMonth } = await import('../useSaveMonth')

const input: MonthEntryInput[] = [
  { name: 'Gold 5g', category: 'commodities', amountCents: 50000, quantity: 3 },
]

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useSaveMonth', () => {
  it('puts the month’s entries to the backend', async () => {
    callAppApi.mockResolvedValue({ entries: [] })
    const { saveMonth } = useSaveMonth()

    await saveMonth('2026-09', input)

    expect(callAppApi).toHaveBeenCalledWith('networth', 'PUT', '/months', {
      query: { month: '2026-09' },
      body: { entries: input },
    })
  })

  it('returns the stored entries', async () => {
    const stored = [entryFactory()]
    callAppApi.mockResolvedValue({ entries: stored })
    const { saveMonth } = useSaveMonth()

    expect(await saveMonth('2026-09', input)).toEqual(stored)
  })

  it('reports that a save is in flight, then that it is done', async () => {
    let release: (result: { entries: NetworthEntry[] }) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { saving, saveMonth } = useSaveMonth()

    const pending = saveMonth('2026-09', input)
    expect(saving.value).toBe(true)

    release({ entries: [] })
    await pending
    expect(saving.value).toBe(false)
  })

  it('surfaces a failure instead of throwing at the caller', async () => {
    callAppApi.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const { error, saveMonth } = useSaveMonth()

    await expect(saveMonth('2026-09', input)).resolves.toBeNull()
    expect(error.value).toBe('The month could not be saved. Check your connection and try again.')
  })
})
