import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../authStore'

function setSessionDefaults(overrides: Partial<Parameters<ReturnType<typeof useAuthStore>['setSession']>[0]> = {}) {
  return {
    username: 'alice',
    token: 'jwt-token',
    expiresIn: '15m',
    refreshToken: 'refresh-token',
    refreshExpiresIn: '7d',
    ...overrides,
  }
}

describe('authStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts signed out when localStorage is empty', () => {
    const store = useAuthStore()

    expect(store.username).toBeNull()
    expect(store.token).toBeNull()
    expect(store.expiresIn).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.canRenew).toBe(false)
  })

  it('persists the username and the token bundle to separate localStorage keys on setSession', () => {
    const store = useAuthStore()

    store.setSession(setSessionDefaults())

    expect(store.isAuthenticated).toBe(true)
    expect(window.localStorage.getItem('auth.username')).toBe('alice')
    const persisted = JSON.parse(window.localStorage.getItem('auth.token') ?? '{}')
    expect(persisted.token).toBe('jwt-token')
    expect(persisted.expiresIn).toBe('15m')
    expect(persisted.refreshToken).toBe('refresh-token')
    expect(persisted.refreshExpiresIn).toBe('7d')
    expect(typeof persisted.accessExpiresAt).toBe('number')
    expect(typeof persisted.refreshExpiresAt).toBe('number')
  })

  it('restores a persisted session for a new store instance', () => {
    const accessExpiresAt = Date.now() + 15 * 60 * 1000
    const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    window.localStorage.setItem('auth.username', 'bob')
    window.localStorage.setItem(
      'auth.token',
      JSON.stringify({
        token: 'persisted-token',
        expiresIn: '30m',
        accessExpiresAt,
        refreshToken: 'persisted-refresh-token',
        refreshExpiresIn: '7d',
        refreshExpiresAt,
      }),
    )

    const store = useAuthStore()

    expect(store.username).toBe('bob')
    expect(store.token).toBe('persisted-token')
    expect(store.expiresIn).toBe('30m')
    expect(store.refreshToken).toBe('persisted-refresh-token')
    expect(store.isAuthenticated).toBe(true)
  })

  it('starts signed out when the token key holds corrupt JSON', () => {
    window.localStorage.setItem('auth.username', 'bob')
    window.localStorage.setItem('auth.token', 'not-valid-json')

    const store = useAuthStore()

    expect(store.username).toBeNull()
    expect(store.token).toBeNull()
    expect(store.expiresIn).toBeNull()
  })

  it('clears both localStorage keys and the session on clearSession', () => {
    const store = useAuthStore()
    store.setSession(setSessionDefaults())

    store.clearSession()

    expect(store.username).toBeNull()
    expect(store.token).toBeNull()
    expect(store.expiresIn).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(window.localStorage.getItem('auth.username')).toBeNull()
    expect(window.localStorage.getItem('auth.token')).toBeNull()
  })

  describe('expiry-aware getters', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('isAccessTokenExpired is false immediately after setSession with a future expiry', () => {
      const store = useAuthStore()
      store.setSession(setSessionDefaults())

      expect(store.isAccessTokenExpired).toBe(false)
      expect(store.isAuthenticated).toBe(true)
    })

    it('isAccessTokenExpired becomes true once the access token duration has elapsed', () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const store = useAuthStore()
      store.setSession(setSessionDefaults({ expiresIn: '15m' }))

      vi.setSystemTime(16 * 60 * 1000)

      expect(store.isAccessTokenExpired).toBe(true)
      expect(store.isAuthenticated).toBe(false)
    })

    it('canRenew is true while the refresh allowance has not yet expired', () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const store = useAuthStore()
      store.setSession(setSessionDefaults({ expiresIn: '15m', refreshExpiresIn: '7d' }))

      vi.setSystemTime(16 * 60 * 1000)

      expect(store.canRenew).toBe(true)
    })

    it('canRenew becomes false once the refresh allowance has also expired', () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const store = useAuthStore()
      store.setSession(setSessionDefaults({ expiresIn: '15m', refreshExpiresIn: '7d' }))

      vi.setSystemTime(8 * 24 * 60 * 60 * 1000)

      expect(store.canRenew).toBe(false)
    })

    it('canRenew is false when there is no session at all', () => {
      const store = useAuthStore()

      expect(store.canRenew).toBe(false)
    })
  })
})
