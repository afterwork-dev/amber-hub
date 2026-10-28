import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLogout } from '../useLogout'
import { useAuthStore } from '../../stores/authStore'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

describe('useLogout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
  })

  it('clears the session and redirects to login', () => {
    const authStore = useAuthStore()
    authStore.setSession({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })
    const clearSessionSpy = vi.spyOn(authStore, 'clearSession')

    const { logout } = useLogout()
    logout()

    expect(clearSessionSpy).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'login' })
  })
})
