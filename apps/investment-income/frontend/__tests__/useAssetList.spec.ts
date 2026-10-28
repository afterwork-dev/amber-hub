import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InvestmentIncomeAsset } from '../../shared/types'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useAssetList } = await import('../useAssetList')

const newest: InvestmentIncomeAsset = {
  id: 'asset-1',
  userId: 'user-1',
  name: 'Vanguard FTSE All-World',
  bookingName: 'VANG FTSE AW DIST',
  createdAt: '2026-09-12T10:14:05.213Z',
}

const older: InvestmentIncomeAsset = {
  id: 'asset-0',
  userId: 'user-1',
  name: 'Flat, Main Street 4',
  createdAt: '2026-09-11T08:02:44.900Z',
}

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useAssetList', () => {
  it('starts empty, idle, and without a complaint', () => {
    const { assets, loading, error } = useAssetList()

    expect(assets.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('asks the backend for the assets', async () => {
    callAppApi.mockResolvedValue({ assets: [] })
    const { loadAssets } = useAssetList()

    await loadAssets()

    expect(callAppApi).toHaveBeenCalledWith('investment-income', 'GET', '/assets')
  })

  it('exposes what came back, in name order whatever order it arrived in', async () => {
    callAppApi.mockResolvedValue({ assets: [newest, older] })
    const { assets, loadAssets } = useAssetList()

    await loadAssets()

    // The dropdown renders this list as-is, so it must match the order the cards use.
    expect(assets.value).toEqual([older, newest])
  })

  it('reports that a load is in flight, then that it is done', async () => {
    let release: (payload: { assets: InvestmentIncomeAsset[] }) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { loading, loadAssets } = useAssetList()

    expect(loading.value).toBe(false)
    const pending = loadAssets()
    expect(loading.value).toBe(true)

    release({ assets: [] })
    await pending
    expect(loading.value).toBe(false)
  })

  it('surfaces a load failure without throwing or inventing assets', async () => {
    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    const { assets, loading, error, loadAssets } = useAssetList()

    await expect(loadAssets()).resolves.toBeUndefined()
    expect(assets.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toMatch(/try again/i)
  })

  it('keeps the failure free of transport wording', async () => {
    callAppApi.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const { error, loadAssets } = useAssetList()

    await loadAssets()

    expect(error.value).not.toMatch(/APP_STORAGE_UNAVAILABLE/)
  })

  it('keeps the assets it already had when a reload fails', async () => {
    callAppApi.mockResolvedValue({ assets: [newest] })
    const { assets, loadAssets } = useAssetList()
    await loadAssets()

    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    await loadAssets()

    expect(assets.value).toEqual([newest])
  })

  it('clears a previous failure when a retry succeeds', async () => {
    callAppApi.mockRejectedValueOnce(new Error('storage unavailable'))
    const { error, loadAssets } = useAssetList()
    await loadAssets()
    expect(error.value).toBeTruthy()

    callAppApi.mockResolvedValue({ assets: [newest] })
    await loadAssets()

    expect(error.value).toBeNull()
  })

  it('slots an added asset into name order without refetching', async () => {
    callAppApi.mockResolvedValue({ assets: [older] })
    const { assets, loadAssets, addAsset } = useAssetList()
    await loadAssets()
    callAppApi.mockClear()

    addAsset(newest)

    expect(assets.value).toEqual([older, newest])
    expect(callAppApi).not.toHaveBeenCalled()
  })

  it('sorts the list the way the cards do: case and accents folded', async () => {
    const named = (id: string, name: string): InvestmentIncomeAsset => ({
      id,
      userId: 'user-1',
      name,
      createdAt: '2026-09-11T08:02:44.900Z',
    })
    callAppApi.mockResolvedValue({
      assets: [named('a-4', 'Zebra Corp'), named('a-3', 'bond ladder'), named('a-2', '\u00e4tna Fund'), named('a-1', 'Amundi MSCI World')],
    })
    const { assets, loadAssets } = useAssetList()

    await loadAssets()

    expect(assets.value.map((asset) => asset.name)).toEqual([
      'Amundi MSCI World',
      '\u00e4tna Fund',
      'bond ladder',
      'Zebra Corp',
    ])
  })

  it('keeps two assets that share a name in a stable order', () => {
    const twin = { ...older, id: 'asset-9' }
    const { assets, addAsset } = useAssetList()

    addAsset(twin)
    addAsset(older)

    expect(assets.value.map((asset) => asset.id)).toEqual(['asset-0', 'asset-9'])
  })

  it('can take the first asset a user ever adds', () => {
    const { assets, addAsset } = useAssetList()

    addAsset(newest)

    expect(assets.value).toEqual([newest])
  })

  it('drops exactly the asset it is told to', async () => {
    callAppApi.mockResolvedValue({ assets: [newest, older] })
    const { assets, loadAssets, removeAsset } = useAssetList()
    await loadAssets()

    removeAsset('asset-1')

    expect(assets.value).toEqual([older])
  })

  it('ignores an id it does not hold', async () => {
    callAppApi.mockResolvedValue({ assets: [newest] })
    const { assets, loadAssets, removeAsset } = useAssetList()
    await loadAssets()

    removeAsset('asset-never-existed')

    expect(assets.value).toEqual([newest])
  })
})
