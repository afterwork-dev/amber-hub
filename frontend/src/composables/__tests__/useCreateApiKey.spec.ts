import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCreateApiKey } from '../useCreateApiKey'
import { HttpClientError } from '../../services/httpClient'

vi.mock('../../services/apiKeyService', () => ({
  createApiKey: vi.fn(),
}))

import { createApiKey } from '../../services/apiKeyService'

const created = {
  id: 'key-1',
  key: 'ahk_abc',
  description: 'CI',
  createdAt: '2026-08-31T10:00:00.000Z',
  expiresAt: '2026-09-30T10:00:00.000Z',
}

describe('useCreateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts idle without an error', () => {
    const { saving, error } = useCreateApiKey()

    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('returns the created key and clears saving on success', async () => {
    vi.mocked(createApiKey).mockResolvedValue(created)
    const { saving, error, create } = useCreateApiKey()

    const result = await create({ description: 'CI', validityDays: 30 })

    expect(result).toEqual(created)
    expect(createApiKey).toHaveBeenCalledWith({ description: 'CI', validityDays: 30 })
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('sets saving while the request is in flight', async () => {
    let resolveRequest: (value: typeof created) => void = () => {}
    vi.mocked(createApiKey).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    const { saving, create } = useCreateApiKey()

    const pending = create({ validityDays: 30 })
    expect(saving.value).toBe(true)

    resolveRequest(created)
    await pending
    expect(saving.value).toBe(false)
  })

  it('surfaces the server message when the request fails', async () => {
    vi.mocked(createApiKey).mockRejectedValue(
      new HttpClientError('validityDays must be 30, 60, or 90', 'VALIDATION_ERROR'),
    )
    const { saving, error, create } = useCreateApiKey()

    const result = await create({ validityDays: 30 })

    expect(result).toBeNull()
    expect(error.value).toBe('validityDays must be 30, 60, or 90')
    expect(saving.value).toBe(false)
  })

  it('falls back to a generic message for an unexpected failure', async () => {
    vi.mocked(createApiKey).mockRejectedValue(new Error('boom'))
    const { error, create } = useCreateApiKey()

    await create({ validityDays: 30 })

    expect(error.value).toContain('could not be created')
  })

  it('clears a previous error when a later attempt succeeds', async () => {
    vi.mocked(createApiKey).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(createApiKey).mockResolvedValueOnce(created)
    const { error, create } = useCreateApiKey()

    await create({ validityDays: 30 })
    expect(error.value).not.toBeNull()

    await create({ validityDays: 30 })
    expect(error.value).toBeNull()
  })
})
