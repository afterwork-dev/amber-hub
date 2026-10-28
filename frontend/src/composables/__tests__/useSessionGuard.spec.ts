import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionGuard } from '../useSessionGuard'
import { useAuthStore } from '../../stores/authStore'

const push = vi.fn()
const currentRoute = { value: { meta: { requiresAuth: true } } }
vi.mock('vue-router', () => ({
  useRouter: () => ({ push, currentRoute }),
}))

vi.mock('../../services/httpClient', () => ({
  renewSession: vi.fn(),
}))

import { renewSession } from '../../services/httpClient'

function signInWith(overrides: { expiresIn: string; refreshExpiresIn: string }): void {
  useAuthStore().setSession({
    username: 'alice',
    token: 'jwt-token',
    expiresIn: overrides.expiresIn,
    refreshToken: 'refresh-token',
    refreshExpiresIn: overrides.refreshExpiresIn,
  })
}

describe('useSessionGuard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
    push.mockClear()
    vi.mocked(renewSession).mockReset()
    currentRoute.value = { meta: { requiresAuth: true } }
  })

  it('does nothing when the access token is still valid', async () => {
    signInWith({ expiresIn: '15m', refreshExpiresIn: '7d' })

    const { checkSession } = useSessionGuard()
    await checkSession()

    expect(renewSession).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(useAuthStore().token).toBe('jwt-token')
  })

  it('renews and does not redirect when only the access token is expired', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '7d' })
    vi.mocked(renewSession).mockResolvedValue(true)

    const { checkSession } = useSessionGuard()
    await checkSession()

    expect(renewSession).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('clears the session and redirects to login when both tokens are expired', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '-1s' })

    const { checkSession } = useSessionGuard()
    await checkSession()

    expect(renewSession).not.toHaveBeenCalled()
    expect(useAuthStore().token).toBeNull()
    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })

  it('clears the session and redirects when there is no session at all and the route requires auth', async () => {
    const { checkSession } = useSessionGuard()
    await checkSession()

    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })

  it('clears but does not redirect when there is no session and the current route does not require auth', async () => {
    currentRoute.value = { meta: { requiresAuth: false } }

    const { checkSession } = useSessionGuard()
    await checkSession()

    expect(push).not.toHaveBeenCalled()
  })

  it('clears and redirects when renewal itself fails despite an unexpired-looking refresh allowance', async () => {
    signInWith({ expiresIn: '-1s', refreshExpiresIn: '7d' })
    vi.mocked(renewSession).mockResolvedValue(false)

    const { checkSession } = useSessionGuard()
    await checkSession()

    expect(useAuthStore().token).toBeNull()
    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })
})
