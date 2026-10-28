import { describe, it, expect, vi, beforeEach } from 'vitest'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useDeleteEntry } = await import('../useDeleteEntry')

beforeEach(() => {
  callAppApi.mockReset()
  callAppApi.mockResolvedValue({ id: 'entry-1' })
})

describe('useDeleteEntry', () => {
  it('starts idle and without a complaint', () => {
    const { deleting, error } = useDeleteEntry()

    expect(deleting.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('asks the backend to delete that one entry', async () => {
    const { deleteEntry } = useDeleteEntry()

    await deleteEntry('entry-1')

    expect(callAppApi).toHaveBeenCalledWith('investment-income', 'DELETE', '/entries', {
      query: { id: 'entry-1' },
    })
  })

  it('reports that the entry is gone', async () => {
    const { deleteEntry } = useDeleteEntry()

    await expect(deleteEntry('entry-1')).resolves.toBe(true)
  })

  it('reports that a delete is in flight, then that it is done', async () => {
    let release: (payload: unknown) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { deleting, deleteEntry } = useDeleteEntry()

    expect(deleting.value).toBe(false)
    const pending = deleteEntry('entry-1')
    expect(deleting.value).toBe(true)

    release({ id: 'entry-1' })
    await pending
    expect(deleting.value).toBe(false)
  })

  it('says the entry is still there when the delete failed', async () => {
    callAppApi.mockRejectedValue(new Error('APP_BACKEND_HANDLER_ERROR'))
    const { deleting, error, deleteEntry } = useDeleteEntry()

    await expect(deleteEntry('entry-1')).resolves.toBe(false)
    expect(deleting.value).toBe(false)
    expect(error.value).toMatch(/try again/i)
  })

  it('keeps the failure free of transport wording', async () => {
    callAppApi.mockRejectedValue(new Error('APP_BACKEND_HANDLER_ERROR'))
    const { error, deleteEntry } = useDeleteEntry()

    await deleteEntry('entry-1')

    expect(error.value).not.toMatch(/APP_BACKEND_HANDLER_ERROR/)
  })

  it('never throws at its caller, which is mid-render', async () => {
    callAppApi.mockRejectedValue(new Error('storage unavailable'))
    const { deleteEntry } = useDeleteEntry()

    await expect(deleteEntry('entry-1')).resolves.toBe(false)
  })

  it('clears a previous failure when a retry succeeds', async () => {
    callAppApi.mockRejectedValueOnce(new Error('storage unavailable'))
    const { error, deleteEntry } = useDeleteEntry()
    await deleteEntry('entry-1')
    expect(error.value).toBeTruthy()

    await deleteEntry('entry-1')

    expect(error.value).toBeNull()
  })
})
