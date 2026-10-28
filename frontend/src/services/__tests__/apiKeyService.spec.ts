import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiKey, deleteApiKey, listApiKeys } from '../apiKeyService'

vi.mock('../httpClient', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpDelete: vi.fn(),
}))

import { httpDelete, httpGet, httpPost } from '../httpClient'

const created = {
  id: 'key-1',
  key: 'ahk_abc',
  description: 'CI',
  createdAt: '2026-08-31T10:00:00.000Z',
  expiresAt: '2026-09-30T10:00:00.000Z',
}

describe('createApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the input to /api-keys and returns the created key', async () => {
    vi.mocked(httpPost).mockResolvedValue(created)

    const result = await createApiKey({ description: 'CI', validityDays: 30 })

    expect(result).toEqual(created)
    expect(httpPost).toHaveBeenCalledWith('/api-keys', { description: 'CI', validityDays: 30 })
  })

  it('posts without a description when none is given', async () => {
    vi.mocked(httpPost).mockResolvedValue({ ...created, description: '' })

    await createApiKey({ validityDays: 90 })

    expect(httpPost).toHaveBeenCalledWith('/api-keys', { validityDays: 90 })
  })

  it('propagates a failure from the http client', async () => {
    vi.mocked(httpPost).mockRejectedValue(new Error('boom'))

    await expect(createApiKey({ validityDays: 30 })).rejects.toThrow('boom')
  })
})

describe('listApiKeys', () => {
  const summaries = [
    { id: 'k2', description: '', createdAt: '2026-08-01T10:00:00.000Z', expiresAt: '2026-09-30T10:00:00.000Z' },
    { id: 'k1', description: 'CI', createdAt: '2026-07-01T10:00:00.000Z', expiresAt: '2026-08-30T10:00:00.000Z' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets /api-keys and returns the unwrapped list', async () => {
    vi.mocked(httpGet).mockResolvedValue({ apiKeys: summaries })

    const result = await listApiKeys()

    expect(httpGet).toHaveBeenCalledWith('/api-keys')
    expect(result).toEqual(summaries)
  })

  it('propagates a failure from the http client', async () => {
    vi.mocked(httpGet).mockRejectedValue(new Error('boom'))

    await expect(listApiKeys()).rejects.toThrow('boom')
  })
})

describe('deleteApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes /api-keys/{id} through the http client', async () => {
    vi.mocked(httpDelete).mockResolvedValue({ id: 'k1' })

    await deleteApiKey('k1')

    expect(httpDelete).toHaveBeenCalledWith('/api-keys/k1')
  })

  it('propagates a failure from the http client', async () => {
    vi.mocked(httpDelete).mockRejectedValue(new Error('boom'))

    await expect(deleteApiKey('k1')).rejects.toThrow('boom')
  })
})
