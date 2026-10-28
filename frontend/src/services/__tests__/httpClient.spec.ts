import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { httpDelete, httpGet, httpPost, HttpClientError } from '../httpClient'
import { useAuthStore } from '../../stores/authStore'

vi.mock('../userService', () => ({
  refresh: vi.fn(),
}))

vi.mock('../../router', () => ({
  default: { push: vi.fn() },
}))

import { refresh } from '../userService'
import router from '../../router'

function signIn(overrides: Partial<{ refreshExpiresIn: string }> = {}): void {
  useAuthStore().setSession({
    username: 'alice',
    token: 'jwt-token',
    expiresIn: '15m',
    refreshToken: 'refresh-token',
    refreshExpiresIn: overrides.refreshExpiresIn ?? '7d',
  })
}

function unauthorizedBody() {
  return {
    success: false,
    data: null,
    error: { errorCode: 'UNAUTHORIZED', errorMessage: 'Authentication required' },
  }
}

describe('httpGet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the request against the configured API base URL with no session', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { message: 'hi' }, error: null }),
    } as Response)

    await httpGet<{ message: string }>('/probe')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/probe', {
      headers: undefined,
      credentials: 'include',
    })
  })

  it('attaches the Authorization header from authStore for a non-auth path', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { message: 'hi' }, error: null }),
    } as Response)

    await httpGet<{ message: string }>('/probe')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/probe', {
      headers: { Authorization: 'Bearer jwt-token' },
      credentials: 'include',
    })
  })

  it('returns the data when the response succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { message: 'hi' }, error: null }),
    } as Response)

    const result = await httpGet<{ message: string }>('/probe')

    expect(result).toEqual({ message: 'hi' })
  })

  it('throws a friendly error when the network request fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    await expect(httpGet('/probe')).rejects.toThrow('Unable to reach the server')
  })

  it('throws a friendly error when the response body is not valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => {
        throw new Error('bad json')
      },
    } as unknown as Response)

    await expect(httpGet('/probe')).rejects.toThrow('Received an invalid response from the server')
  })

  it('throws the server error message and code when success is false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        success: false,
        data: null,
        error: { errorCode: 'INTERNAL_ERROR', errorMessage: 'Something went wrong' },
      }),
    } as Response)

    const error: HttpClientError = await httpGet('/probe').catch((e) => e)

    expect(error).toBeInstanceOf(HttpClientError)
    expect(error.message).toBe('Something went wrong')
    expect(error.errorCode).toBe('INTERNAL_ERROR')
  })

  it('throws when success is true but data is missing', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: null, error: null }),
    } as Response)

    await expect(httpGet('/probe')).rejects.toThrow('Request failed')
  })
})

describe('httpPost', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends a JSON POST request against the configured API base URL with no session', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { id: '1' }, error: null }),
    } as Response)

    const result = await httpPost<{ id: string }>('/auth/register', { username: 'alice' })

    expect(result).toEqual({ id: '1' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice' }),
      credentials: 'include',
    })
  })

  it('attaches the Authorization header for a non-auth path when signed in', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { id: '1' }, error: null }),
    } as Response)

    await httpPost<{ id: string }>('/apps', { name: 'app' })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
      body: JSON.stringify({ name: 'app' }),
      credentials: 'include',
    })
  })

  it('never attaches the Authorization header for an /auth/ path, even when signed in', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { id: '1' }, error: null }),
    } as Response)

    await httpPost<{ id: string }>('/auth/login', { username: 'alice' })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice' }),
      credentials: 'include',
    })
  })

  it('throws the server error message and code when success is false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        success: false,
        data: null,
        error: { errorCode: 'USERNAME_TAKEN', errorMessage: 'This username is already taken' },
      }),
    } as Response)

    const error: HttpClientError = await httpPost('/auth/register', {}).catch((e) => e)

    expect(error).toBeInstanceOf(HttpClientError)
    expect(error.message).toBe('This username is already taken')
    expect(error.errorCode).toBe('USERNAME_TAKEN')
  })
})

describe('httpGet / httpPost — renewal on 401', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(refresh).mockReset()
    vi.mocked(router.push).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renews the session and retries once when a non-auth request gets UNAUTHORIZED', async () => {
    signIn()
    vi.mocked(fetch)
      .mockResolvedValueOnce({ json: async () => unauthorizedBody() } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { message: 'hi' }, error: null }),
      } as Response)
    vi.mocked(refresh).mockResolvedValue({
      username: 'alice',
      token: 'new-jwt-token',
      expiresIn: '15m',
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: '7d',
    })

    const result = await httpGet<{ message: string }>('/probe')

    expect(result).toEqual({ message: 'hi' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledWith('refresh-token')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(useAuthStore().token).toBe('new-jwt-token')
  })

  it('does not attempt renewal for an UNAUTHORIZED response from an /auth/ path', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => unauthorizedBody() } as Response)

    await expect(httpPost('/auth/login', {})).rejects.toMatchObject({ errorCode: 'UNAUTHORIZED' })

    expect(refresh).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shares a single in-flight renewal across two concurrent UNAUTHORIZED responses', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({ json: async () => unauthorizedBody() } as Response)
    let resolveRefresh!: (value: Awaited<ReturnType<typeof refresh>>) => void
    vi.mocked(refresh).mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve
      }),
    )

    const first = httpGet('/probe')
    const second = httpGet('/apps')
    resolveRefresh({
      username: 'alice',
      token: 'new-jwt-token',
      expiresIn: '15m',
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: '7d',
    })

    await Promise.allSettled([first, second])

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('propagates the original error when renewal itself fails', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({ json: async () => unauthorizedBody() } as Response)
    vi.mocked(refresh).mockRejectedValue(new HttpClientError('REFRESH_TOKEN_INVALID'))

    await expect(httpGet('/probe')).rejects.toMatchObject({ errorCode: 'UNAUTHORIZED' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('clears the session and redirects to login when renewal fails', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({ json: async () => unauthorizedBody() } as Response)
    vi.mocked(refresh).mockRejectedValue(new HttpClientError('REFRESH_TOKEN_INVALID'))

    await expect(httpGet('/probe')).rejects.toMatchObject({ errorCode: 'UNAUTHORIZED' })

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(useAuthStore().token).toBeNull()
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({ name: 'login' })
  })

  it('clears the session and redirects to login when there is no refresh token to renew with', async () => {
    signIn()
    useAuthStore().clearSession()
    // Re-sign in with an already-expired refresh allowance, leaving no way to renew.
    useAuthStore().setSession({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
      refreshToken: 'refresh-token',
      refreshExpiresIn: '-1s',
    })
    vi.mocked(fetch).mockResolvedValue({ json: async () => unauthorizedBody() } as Response)

    await expect(httpGet('/probe')).rejects.toMatchObject({ errorCode: 'UNAUTHORIZED' })

    expect(refresh).not.toHaveBeenCalled()
    expect(useAuthStore().token).toBeNull()
    expect(router.push).toHaveBeenCalledWith({ name: 'login' })
  })

  it('redirects exactly once when two concurrent requests both fail to renew', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({ json: async () => unauthorizedBody() } as Response)
    vi.mocked(refresh).mockRejectedValue(new HttpClientError('REFRESH_TOKEN_INVALID'))

    const first = httpGet('/probe')
    const second = httpGet('/apps')

    await Promise.allSettled([first, second])

    expect(router.push).toHaveBeenCalledTimes(1)
  })

  it('does not redirect for a non-UNAUTHORIZED error', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        success: false,
        data: null,
        error: { errorCode: 'VALIDATION_ERROR', errorMessage: 'Bad input' },
      }),
    } as Response)

    await expect(httpPost('/apps', {})).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' })

    expect(refresh).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
    expect(useAuthStore().isAuthenticated).toBe(true)
  })
})

describe('httpDelete', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(refresh).mockReset()
    vi.mocked(router.push).mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends a DELETE with the auth header and returns the unwrapped data', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: { id: 'k1' }, error: null }),
    } as Response)

    const result = await httpDelete<{ id: string }>('/api-keys/k1')

    expect(result).toEqual({ id: 'k1' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/api-keys/k1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer jwt-token' },
      credentials: 'include',
    })
  })

  it('renews the session and retries once on UNAUTHORIZED', async () => {
    signIn()
    vi.mocked(fetch)
      .mockResolvedValueOnce({ json: async () => unauthorizedBody() } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 'k1' }, error: null }),
      } as Response)
    vi.mocked(refresh).mockResolvedValue({
      username: 'alice',
      token: 'new-jwt-token',
      expiresIn: '15m',
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: '7d',
    })

    const result = await httpDelete<{ id: string }>('/api-keys/k1')

    expect(result).toEqual({ id: 'k1' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws the server error message and code when success is false', async () => {
    signIn()
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({
        success: false,
        data: null,
        error: { errorCode: 'NOT_FOUND', errorMessage: 'API key not found' },
      }),
    } as Response)

    const error: HttpClientError = await httpDelete('/api-keys/gone').catch((e) => e)

    expect(error).toBeInstanceOf(HttpClientError)
    expect(error.errorCode).toBe('NOT_FOUND')
  })
})
