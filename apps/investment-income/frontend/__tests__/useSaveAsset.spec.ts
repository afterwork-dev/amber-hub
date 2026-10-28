import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NewAssetInput, InvestmentIncomeAsset } from '../../shared/types'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useSaveAsset } = await import('../useSaveAsset')

const input: NewAssetInput = { name: 'Vanguard FTSE All-World' }

const stored: InvestmentIncomeAsset = {
  id: 'asset-1',
  userId: 'user-1',
  name: 'Vanguard FTSE All-World',
  createdAt: '2026-09-12T10:14:05.213Z',
}

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useSaveAsset', () => {
  it('starts idle and without a complaint', () => {
    const { saving, error } = useSaveAsset()

    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('posts the asset to the app backend', async () => {
    callAppApi.mockResolvedValue(stored)
    const { saveAsset } = useSaveAsset()

    await saveAsset(input)

    expect(callAppApi).toHaveBeenCalledWith('investment-income', 'POST', '/assets', { body: input })
  })

  it('returns the stored asset the backend assigned', async () => {
    callAppApi.mockResolvedValue(stored)
    const { saveAsset } = useSaveAsset()

    expect(await saveAsset(input)).toEqual(stored)
  })

  it('reports that a save is in flight, then that it is done', async () => {
    let release: (asset: InvestmentIncomeAsset) => void = () => {}
    callAppApi.mockReturnValue(new Promise<InvestmentIncomeAsset>((resolve) => (release = resolve)))
    const { saving, saveAsset } = useSaveAsset()

    expect(saving.value).toBe(false)
    const pending = saveAsset(input)
    expect(saving.value).toBe(true)

    release(stored)
    await pending
    expect(saving.value).toBe(false)
  })

  it('surfaces a failure instead of throwing at the caller', async () => {
    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    const { saving, error, saveAsset } = useSaveAsset()

    await expect(saveAsset(input)).resolves.toBeNull()
    expect(saving.value).toBe(false)
    expect(error.value).toBeTruthy()
  })

  it('reports the failure in words a user can act on', async () => {
    callAppApi.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const { error, saveAsset } = useSaveAsset()

    await saveAsset(input)

    expect(error.value).toMatch(/try again/i)
    expect(error.value).not.toMatch(/APP_STORAGE_UNAVAILABLE/)
  })

  it('clears a previous failure when a later save succeeds', async () => {
    callAppApi.mockRejectedValueOnce(new Error('storage unavailable'))
    const { error, saveAsset } = useSaveAsset()
    await saveAsset(input)
    expect(error.value).toBeTruthy()

    callAppApi.mockResolvedValue(stored)
    await saveAsset(input)

    expect(error.value).toBeNull()
  })
})
