import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeleteApiKey } from '../useDeleteApiKey'
import { HttpClientError } from '../../services/httpClient'

vi.mock('../../services/apiKeyService', () => ({
  deleteApiKey: vi.fn(),
}))

import { deleteApiKey } from '../../services/apiKeyService'

describe('useDeleteApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts idle, error-free', () => {
    const { deleting, error } = useDeleteApiKey()

    expect(deleting.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('returns true and calls the service on success', async () => {
    vi.mocked(deleteApiKey).mockResolvedValue(undefined)
    const { deleting, error, remove } = useDeleteApiKey()

    const result = await remove('k1')

    expect(result).toBe(true)
    expect(deleteApiKey).toHaveBeenCalledWith('k1')
    expect(deleting.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('treats a NOT_FOUND failure as success, since the key is already gone', async () => {
    vi.mocked(deleteApiKey).mockRejectedValue(new HttpClientError('gone', 'NOT_FOUND'))
    const { error, remove } = useDeleteApiKey()

    const result = await remove('k1')

    expect(result).toBe(true)
    expect(error.value).toBeNull()
  })

  it('returns false and sets a friendly error on other failures', async () => {
    vi.mocked(deleteApiKey).mockRejectedValue(new Error('boom'))
    const { error, remove } = useDeleteApiKey()

    const result = await remove('k1')

    expect(result).toBe(false)
    expect(error.value).toContain('could not be deleted')
  })

  it('surfaces a server error message when present', async () => {
    vi.mocked(deleteApiKey).mockRejectedValue(new HttpClientError('Nope from server', 'INTERNAL_ERROR'))
    const { error, remove } = useDeleteApiKey()

    await remove('k1')

    expect(error.value).toBe('Nope from server')
  })
})
