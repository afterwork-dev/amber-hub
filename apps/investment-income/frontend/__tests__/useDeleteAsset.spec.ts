import { describe, it, expect, vi, beforeEach } from 'vitest'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useDeleteAsset } = await import('../useDeleteAsset')

beforeEach(() => {
  callAppApi.mockReset()
  callAppApi.mockResolvedValue({ id: 'asset-1' })
})

describe('useDeleteAsset', () => {
  it('starts idle and without a complaint', () => {
    const { deleting, error } = useDeleteAsset()

    expect(deleting.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('asks the backend to delete that one asset', async () => {
    const { deleteAsset } = useDeleteAsset()

    await deleteAsset('asset-1')

    expect(callAppApi).toHaveBeenCalledWith('investment-income', 'DELETE', '/assets', {
      query: { id: 'asset-1' },
    })
  })

  it('reports that the asset is gone', async () => {
    const { deleteAsset } = useDeleteAsset()

    await expect(deleteAsset('asset-1')).resolves.toBe(true)
  })

  it('reports that a delete is in flight, then that it is done', async () => {
    let release: (payload: unknown) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { deleting, deleteAsset } = useDeleteAsset()

    expect(deleting.value).toBe(false)
    const pending = deleteAsset('asset-1')
    expect(deleting.value).toBe(true)

    release({ id: 'asset-1' })
    await pending
    expect(deleting.value).toBe(false)
  })

  it('says the asset is still there when the delete failed', async () => {
    callAppApi.mockRejectedValue(new Error('APP_BACKEND_HANDLER_ERROR'))
    const { deleting, error, deleteAsset } = useDeleteAsset()

    await expect(deleteAsset('asset-1')).resolves.toBe(false)
    expect(deleting.value).toBe(false)
    expect(error.value).toMatch(/try again/i)
  })

  it('keeps the failure free of transport wording', async () => {
    callAppApi.mockRejectedValue(new Error('APP_BACKEND_HANDLER_ERROR'))
    const { error, deleteAsset } = useDeleteAsset()

    await deleteAsset('asset-1')

    expect(error.value).not.toMatch(/APP_BACKEND_HANDLER_ERROR/)
  })

  it('never throws at its caller, which is mid-render', async () => {
    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    const { deleteAsset } = useDeleteAsset()

    await expect(deleteAsset('asset-1')).resolves.toBe(false)
  })

  it('clears a previous failure when a retry succeeds', async () => {
    callAppApi.mockRejectedValueOnce(new Error('storage unavailable'))
    const { error, deleteAsset } = useDeleteAsset()
    await deleteAsset('asset-1')
    expect(error.value).toBeTruthy()

    await deleteAsset('asset-1')

    expect(error.value).toBeNull()
  })
})
