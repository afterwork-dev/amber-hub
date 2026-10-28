import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NewEntryInput, InvestmentIncomeEntry } from '../../shared/types'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useSaveEntry } = await import('../useSaveEntry')

const input: NewEntryInput = {
  payoutDate: '2026-09-10',
  amountCents: 1250,
  assetId: 'asset-1',
}

const stored: InvestmentIncomeEntry = {
  id: 'entry-1',
  userId: 'user-1',
  payoutDate: '2026-09-10',
  amountCents: 1250,
  assetId: 'asset-1',
  createdAt: '2026-09-13T09:41:12.008Z',
}

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useSaveEntry', () => {
  it('starts idle and without a complaint', () => {
    const { saving, error } = useSaveEntry()

    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('posts the entry to the app backend', async () => {
    callAppApi.mockResolvedValue(stored)
    const { saveEntry } = useSaveEntry()

    await saveEntry(input)

    expect(callAppApi).toHaveBeenCalledWith('investment-income', 'POST', '/entries', { body: input })
  })

  it('returns the stored entry the backend assigned', async () => {
    callAppApi.mockResolvedValue(stored)
    const { saveEntry } = useSaveEntry()

    expect(await saveEntry(input)).toEqual(stored)
  })

  it('reports that a save is in flight, then that it is done', async () => {
    let release: (entry: InvestmentIncomeEntry) => void = () => {}
    callAppApi.mockReturnValue(new Promise<InvestmentIncomeEntry>((resolve) => (release = resolve)))
    const { saving, saveEntry } = useSaveEntry()

    expect(saving.value).toBe(false)
    const pending = saveEntry(input)
    expect(saving.value).toBe(true)

    release(stored)
    await pending
    expect(saving.value).toBe(false)
  })

  it('surfaces a failure instead of throwing at the caller', async () => {
    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    const { saving, error, saveEntry } = useSaveEntry()

    await expect(saveEntry(input)).resolves.toBeNull()
    expect(saving.value).toBe(false)
    expect(error.value).toBeTruthy()
  })

  it('reports the failure in words a user can act on', async () => {
    callAppApi.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const { error, saveEntry } = useSaveEntry()

    await saveEntry(input)

    expect(error.value).toMatch(/try again/i)
    expect(error.value).not.toMatch(/APP_STORAGE_UNAVAILABLE/)
  })

  it('never lets a rejection escape as an unhandled one', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    callAppApi.mockRejectedValue(new Error('storage unavailable'))

    await useSaveEntry().saveEntry(input)
    await new Promise((resolve) => setTimeout(resolve, 0))
    process.off('unhandledRejection', unhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })

  it('clears a previous failure when a later save succeeds', async () => {
    callAppApi.mockRejectedValueOnce(new Error('storage unavailable'))
    const { error, saveEntry } = useSaveEntry()
    await saveEntry(input)
    expect(error.value).toBeTruthy()

    callAppApi.mockResolvedValue(stored)
    await saveEntry(input)

    expect(error.value).toBeNull()
  })
})
