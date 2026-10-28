import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRegister } from '../useRegister'
import { HttpClientError } from '../../services/httpClient'
import { useAuthStore } from '../../stores/authStore'

vi.mock('../../services/userService', () => ({
  register: vi.fn(),
}))

import { register } from '../../services/userService'

describe('useRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts in a non-loading, non-success, error-free state', () => {
    const { loading, error, success } = useRegister()

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(success.value).toBe(false)
  })

  it('sets success and stores the session on a successful registration', async () => {
    vi.mocked(register).mockResolvedValue({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })

    const { loading, error, success, submit } = useRegister()
    await submit('alice', 'correct-horse')

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(success.value).toBe(true)

    const authStore = useAuthStore()
    expect(authStore.username).toBe('alice')
    expect(authStore.token).toBe('jwt-token')
  })

  it('sets a friendly error and leaves success false on failure', async () => {
    vi.mocked(register).mockRejectedValue(new Error('This username is already taken'))

    const { error, success, submit } = useRegister()
    await submit('alice', 'correct-horse')

    expect(success.value).toBe(false)
    expect(error.value).toBe('This username is already taken')
  })

  it('exposes the errorCode from an HttpClientError so callers can render field-specific errors', async () => {
    vi.mocked(register).mockRejectedValue(
      new HttpClientError('This username is already taken', 'USERNAME_TAKEN'),
    )

    const { error, errorCode, submit } = useRegister()
    await submit('alice', 'correct-horse')

    expect(error.value).toBe('This username is already taken')
    expect(errorCode.value).toBe('USERNAME_TAKEN')
  })
})
