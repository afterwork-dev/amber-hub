import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLogin } from '../useLogin'
import { HttpClientError } from '../../services/httpClient'
import { useAuthStore } from '../../stores/authStore'

vi.mock('../../services/userService', () => ({
  login: vi.fn(),
}))

import { login } from '../../services/userService'

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts in a non-loading, non-success, error-free state', () => {
    const { loading, error, success } = useLogin()

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(success.value).toBe(false)
  })

  it('sets success and stores the session on a successful login', async () => {
    vi.mocked(login).mockResolvedValue({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })

    const { loading, error, success, submit } = useLogin()
    await submit('alice', 'correct-horse')

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(success.value).toBe(true)

    const authStore = useAuthStore()
    expect(authStore.username).toBe('alice')
    expect(authStore.token).toBe('jwt-token')
  })

  it('sets a friendly error and leaves success false on failure', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Invalid username or password'))

    const { error, success, submit } = useLogin()
    await submit('alice', 'wrong-password')

    expect(success.value).toBe(false)
    expect(error.value).toBe('Invalid username or password')
  })

  it('exposes the errorCode from an HttpClientError', async () => {
    vi.mocked(login).mockRejectedValue(
      new HttpClientError('Invalid username or password', 'INVALID_CREDENTIALS'),
    )

    const { error, errorCode, submit } = useLogin()
    await submit('alice', 'wrong-password')

    expect(error.value).toBe('Invalid username or password')
    expect(errorCode.value).toBe('INVALID_CREDENTIALS')
  })
})
