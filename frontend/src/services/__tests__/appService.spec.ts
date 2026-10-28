import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildAppResourceUrl, listApps } from '../appService'
import { HttpClientError } from '../httpClient'

vi.mock('../httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../httpClient')>()
  return { ...actual, httpGet: vi.fn() }
})

import { httpGet } from '../httpClient'

describe('listApps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the unwrapped apps array on success', async () => {
    vi.mocked(httpGet).mockResolvedValue({
      apps: [{ id: 'sample-app', displayName: 'Sample App', frontend: null }],
    })

    await expect(listApps()).resolves.toEqual([
      { id: 'sample-app', displayName: 'Sample App', frontend: null },
    ])
    expect(httpGet).toHaveBeenCalledWith('/apps')
  })

  it('rejects with HttpClientError on failure', async () => {
    vi.mocked(httpGet).mockRejectedValue(new HttpClientError('Unable to reach the server'))

    await expect(listApps()).rejects.toThrow(HttpClientError)
  })
})

describe('buildAppResourceUrl', () => {
  it('builds a relative /resources/:appId/frontend/:path URL', () => {
    expect(buildAppResourceUrl('widget-app', 'frontend/index.js')).toBe(
      '/resources/widget-app/frontend/frontend/index.js',
    )
  })
})
