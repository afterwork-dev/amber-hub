import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApiKeyList } from '../useApiKeyList'

vi.mock('../../services/apiKeyService', () => ({
  listApiKeys: vi.fn(),
}))

import { listApiKeys } from '../../services/apiKeyService'

const summary = (id: string, createdAt = '2026-08-01T10:00:00.000Z') => ({
  id,
  description: '',
  createdAt,
  expiresAt: '2026-09-30T10:00:00.000Z',
})

describe('useApiKeyList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts empty, not loading, without error', () => {
    const { apiKeys, loading, error } = useApiKeyList()

    expect(apiKeys.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('populates the list and clears error on a successful load', async () => {
    vi.mocked(listApiKeys).mockResolvedValue([summary('k1'), summary('k2')])
    const { apiKeys, loading, error, load } = useApiKeyList()

    await load()

    expect(apiKeys.value.map((apiKey) => apiKey.id)).toEqual(['k1', 'k2'])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('sets a friendly error and leaves the list empty on failure', async () => {
    vi.mocked(listApiKeys).mockRejectedValue(new Error('boom'))
    const { apiKeys, error, load } = useApiKeyList()

    await load()

    expect(apiKeys.value).toEqual([])
    expect(error.value).toContain('could not be loaded')
  })

  it('adds a created key at the front, copying only summary fields', () => {
    const { apiKeys, add } = useApiKeyList()

    add({
      id: 'new',
      key: 'ahk_secret',
      description: 'CI',
      createdAt: '2026-09-01T10:00:00.000Z',
      expiresAt: '2026-10-01T10:00:00.000Z',
    })

    expect(apiKeys.value[0]).toEqual({
      id: 'new',
      description: 'CI',
      createdAt: '2026-09-01T10:00:00.000Z',
      expiresAt: '2026-10-01T10:00:00.000Z',
    })
    expect(JSON.stringify(apiKeys.value)).not.toContain('ahk_secret')
  })

  it('removes a key by id', () => {
    const { apiKeys, add, remove } = useApiKeyList()
    add({ ...summary('a'), key: 'ahk_a' })
    add({ ...summary('b'), key: 'ahk_b' })

    remove('a')

    expect(apiKeys.value.map((apiKey) => apiKey.id)).toEqual(['b'])
  })
})
