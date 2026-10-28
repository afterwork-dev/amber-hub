import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { requireAuth } from '../requireAuth'
import router from '../../index'
import { useAuthStore } from '../../../stores/authStore'

vi.mock('../../../services/httpClient', () => ({
  renewSession: vi.fn(),
}))

import { renewSession } from '../../../services/httpClient'

function makeRoute(requiresAuth: boolean): RouteLocationNormalized {
  return { meta: { requiresAuth } } as RouteLocationNormalized
}

function signInWith(overrides: { expiresIn: string; refreshExpiresIn: string }): void {
  useAuthStore().setSession({
    username: 'alice',
    token: 'jwt-token',
    expiresIn: overrides.expiresIn,
    refreshToken: 'refresh-token',
    refreshExpiresIn: overrides.refreshExpiresIn,
  })
}

describe('requireAuth guard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(renewSession).mockReset()
  })

  it('redirects to login when the target route requires auth and there is no session', async () => {
    const result = await requireAuth(makeRoute(true), makeRoute(false), () => {})

    expect(result).toEqual({ name: 'login' })
    expect(renewSession).not.toHaveBeenCalled()
  })

  it('allows navigation when the target route requires auth and a valid session exists', async () => {
    signInWith({ expiresIn: '15m', refreshExpiresIn: '7d' })

    const result = await requireAuth(makeRoute(true), makeRoute(false), () => {})

    expect(result).toBe(true)
    expect(renewSession).not.toHaveBeenCalled()
  })

  it('allows navigation to a route that does not require auth, regardless of session state', async () => {
    const result = await requireAuth(makeRoute(false), makeRoute(false), () => {})

    expect(result).toBe(true)
    expect(renewSession).not.toHaveBeenCalled()
  })

  it('renews and allows navigation when the access token is expired but the session is still renewable', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '7d' })
    vi.mocked(renewSession).mockResolvedValue(true)

    const result = await requireAuth(makeRoute(true), makeRoute(false), () => {})

    expect(renewSession).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  it('clears the session and redirects to login when both tokens are expired', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '-1s' })

    const result = await requireAuth(makeRoute(true), makeRoute(false), () => {})

    expect(renewSession).not.toHaveBeenCalled()
    expect(useAuthStore().token).toBeNull()
    expect(result).toEqual({ name: 'login' })
  })

  it('redirects a real /settings navigation to login when the session cannot be renewed', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '-1s' })
    const settings = router.resolve('/settings') as unknown as RouteLocationNormalized

    const result = await requireAuth(settings, makeRoute(false), () => {})

    expect(result).toEqual({ name: 'login' })
  })

  it('clears the session and redirects to login when renewal fails', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '7d' })
    vi.mocked(renewSession).mockResolvedValue(false)

    const result = await requireAuth(makeRoute(true), makeRoute(false), () => {})

    expect(useAuthStore().token).toBeNull()
    expect(result).toEqual({ name: 'login' })
  })
})
