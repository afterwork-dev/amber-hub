import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, refresh, register } from '../userService'

vi.mock('../httpClient', () => ({
  httpPost: vi.fn(),
}))

import { httpPost } from '../httpClient'

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the registration payload and returns the created user', async () => {
    vi.mocked(httpPost).mockResolvedValue({ username: 'alice' })

    const result = await register('alice', 'correct-horse')

    expect(result).toEqual({ username: 'alice' })
    expect(httpPost).toHaveBeenCalledWith('/auth/register', {
      username: 'alice',
      password: 'correct-horse',
    })
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the login payload and returns the issued session', async () => {
    vi.mocked(httpPost).mockResolvedValue({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
    })

    const result = await login('alice', 'correct-horse')

    expect(result).toEqual({ username: 'alice', token: 'jwt-token', expiresIn: '15m' })
    expect(httpPost).toHaveBeenCalledWith('/auth/login', {
      username: 'alice',
      password: 'correct-horse',
    })
  })
})

describe('refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the refresh token and returns the rotated session', async () => {
    vi.mocked(httpPost).mockResolvedValue({
      username: 'alice',
      token: 'new-jwt-token',
      expiresIn: '15m',
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: '7d',
    })

    const result = await refresh('old-refresh-token')

    expect(result).toEqual({
      username: 'alice',
      token: 'new-jwt-token',
      expiresIn: '15m',
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: '7d',
    })
    expect(httpPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh-token' })
  })
})
