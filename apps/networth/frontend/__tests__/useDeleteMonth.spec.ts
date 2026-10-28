import { describe, it, expect, vi, beforeEach } from 'vitest'

const callAppApi = vi.fn()
vi.mock('@amber-hub/app-sdk', () => ({ callAppApi: (...args: unknown[]) => callAppApi(...args) }))

const { useDeleteMonth } = await import('../useDeleteMonth')

beforeEach(() => {
  callAppApi.mockReset()
})

describe('useDeleteMonth', () => {
  it('asks the backend to delete the month', async () => {
    callAppApi.mockResolvedValue({ month: '2026-09' })
    const { deleteMonth } = useDeleteMonth()

    expect(await deleteMonth('2026-09')).toBe(true)
    expect(callAppApi).toHaveBeenCalledWith('networth', 'DELETE', '/months', {
      query: { month: '2026-09' },
    })
  })

  it('reports that a delete is in flight, then that it is done', async () => {
    let release: (value: unknown) => void = () => {}
    callAppApi.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const { deleting, deleteMonth } = useDeleteMonth()

    const pending = deleteMonth('2026-09')
    expect(deleting.value).toBe(true)

    release({})
    await pending
    expect(deleting.value).toBe(false)
  })

  it('surfaces a failure instead of throwing at the caller', async () => {
    callAppApi.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const { error, deleteMonth } = useDeleteMonth()

    expect(await deleteMonth('2026-09')).toBe(false)
    expect(error.value).toBe('The month could not be deleted. Check your connection and try again.')
  })
})
