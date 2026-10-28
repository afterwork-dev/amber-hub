import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppsStore } from '../appsStore'

vi.mock('../../services/appService', () => ({
  listApps: vi.fn(),
}))

import { listApps } from '../../services/appService'

describe('appsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts in a non-loading, empty state', () => {
    const store = useAppsStore()

    expect(store.loading).toBe(false)
    expect(store.apps).toEqual([])
    expect(store.error).toBeNull()
  })

  it('stores the apps list and clears the error on success', async () => {
    vi.mocked(listApps).mockResolvedValue([
      { id: 'sample-app', displayName: 'Sample App', frontend: null },
    ])

    const store = useAppsStore()
    await store.load()

    expect(store.apps).toEqual([{ id: 'sample-app', displayName: 'Sample App', frontend: null }])
    expect(store.error).toBeNull()
  })

  it('stores a friendly error and clears the apps on failure', async () => {
    vi.mocked(listApps).mockRejectedValue(new Error('Unable to reach the server'))

    const store = useAppsStore()
    await store.load()

    expect(store.apps).toEqual([])
    expect(store.error).toBe('Unable to reach the server')
  })

  it('appFor resolves the full installed-app record for a known id and undefined for an unknown one', async () => {
    vi.mocked(listApps).mockResolvedValue([
      { id: 'widget-app', displayName: 'Widget App', frontend: { entry: 'frontend/index.js' } },
    ])

    const store = useAppsStore()
    await store.load()

    expect(store.appFor('widget-app')).toEqual({
      id: 'widget-app',
      displayName: 'Widget App',
      frontend: { entry: 'frontend/index.js' },
    })
    expect(store.appFor('unknown-app')).toBeUndefined()
  })
})
