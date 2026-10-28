import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { User } from '../../user/user.types'

vi.mock('../../../repositories/user/userRepository', () => ({
  findById: vi.fn(),
}))

import * as userRepository from '../../../repositories/user/userRepository'
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../tokenService'

const user: User = {
  id: 'user-123',
  username: 'alice',
  passwordHash: 'hashed-password',
  createdAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_EXPIRES_IN = '30m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'
})

describe('issueAccessToken', () => {
  it('signs a token carrying the user id, username, and an access type marker', () => {
    const { token, expiresIn } = issueAccessToken(user)

    const decoded = jwt.verify(token, 'test-secret') as jwt.JwtPayload
    expect(decoded.sub).toBe('user-123')
    expect(decoded.username).toBe('alice')
    expect(decoded.type).toBe('access')
    expect(expiresIn).toBe('30m')
  })

  it('sets an expiry consistent with JWT_EXPIRES_IN', () => {
    const { token } = issueAccessToken(user)

    const decoded = jwt.verify(token, 'test-secret') as jwt.JwtPayload
    const expectedExpiry = (decoded.iat as number) + 30 * 60
    expect(decoded.exp).toBe(expectedExpiry)
  })

  it('defaults to 15m when JWT_EXPIRES_IN is unset', () => {
    delete process.env.JWT_EXPIRES_IN

    const { expiresIn } = issueAccessToken(user)

    expect(expiresIn).toBe('15m')
  })
})

describe('issueRefreshToken', () => {
  it('signs a token carrying the user id and a refresh type marker, with no username claim', () => {
    const { refreshToken, refreshExpiresIn } = issueRefreshToken(user)

    const decoded = jwt.verify(refreshToken, 'test-secret') as jwt.JwtPayload
    expect(decoded.sub).toBe('user-123')
    expect(decoded.type).toBe('refresh')
    expect(decoded.username).toBeUndefined()
    expect(refreshExpiresIn).toBe('7d')
  })

  it('defaults to 7d when JWT_REFRESH_EXPIRES_IN is unset', () => {
    delete process.env.JWT_REFRESH_EXPIRES_IN

    const { refreshExpiresIn } = issueRefreshToken(user)

    expect(refreshExpiresIn).toBe('7d')
  })
})

describe('verifyAccessToken', () => {
  it('returns the id and username carried by a valid access token', () => {
    const { token } = issueAccessToken(user)

    const result = verifyAccessToken(token)

    expect(result).toEqual({ id: 'user-123', username: 'alice' })
  })

  it('throws UNAUTHORIZED for a malformed/garbage token', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrowError(
      expect.objectContaining({ errorCode: 'UNAUTHORIZED', statusCode: 401 }),
    )
  })

  it('throws UNAUTHORIZED for a token signed with the wrong secret', () => {
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'wrong-secret', {
      subject: 'user-123',
    })

    expect(() => verifyAccessToken(token)).toThrowError(
      expect.objectContaining({ errorCode: 'UNAUTHORIZED', statusCode: 401 }),
    )
  })

  it('throws UNAUTHORIZED for an expired access token', () => {
    const expiredToken = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', {
      subject: 'user-123',
      expiresIn: '-1s',
    })

    expect(() => verifyAccessToken(expiredToken)).toThrowError(
      expect.objectContaining({ errorCode: 'UNAUTHORIZED', statusCode: 401 }),
    )
  })

  it('throws UNAUTHORIZED when given a valid refresh token instead of an access token', () => {
    const { refreshToken } = issueRefreshToken(user)

    expect(() => verifyAccessToken(refreshToken)).toThrowError(
      expect.objectContaining({ errorCode: 'UNAUTHORIZED', statusCode: 401 }),
    )
  })
})

describe('verifyRefreshToken', () => {
  it('returns the user identified by a valid refresh token', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(user)
    const { refreshToken } = issueRefreshToken(user)

    const result = await verifyRefreshToken(refreshToken)

    expect(result).toEqual(user)
    expect(userRepository.findById).toHaveBeenCalledWith('user-123')
  })

  it('does not invalidate the presented refresh token (no rotation enforcement, by design)', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(user)
    const { refreshToken } = issueRefreshToken(user)

    await verifyRefreshToken(refreshToken)
    const secondResult = await verifyRefreshToken(refreshToken)

    expect(secondResult).toEqual(user)
  })

  it('throws VALIDATION_ERROR when no token is given', async () => {
    await expect(verifyRefreshToken('')).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('throws REFRESH_TOKEN_INVALID for a malformed/garbage token', async () => {
    await expect(verifyRefreshToken('not-a-jwt')).rejects.toMatchObject({
      errorCode: 'REFRESH_TOKEN_INVALID',
      statusCode: 401,
    })
  })

  it('throws REFRESH_TOKEN_INVALID for an expired refresh token', async () => {
    const expiredToken = jwt.sign({ type: 'refresh' }, 'test-secret', {
      subject: 'user-123',
      expiresIn: '-1s',
    })

    await expect(verifyRefreshToken(expiredToken)).rejects.toMatchObject({
      errorCode: 'REFRESH_TOKEN_INVALID',
      statusCode: 401,
    })
  })

  it('throws REFRESH_TOKEN_INVALID when given a valid access token instead of a refresh token', async () => {
    const { token } = issueAccessToken(user)

    await expect(verifyRefreshToken(token)).rejects.toMatchObject({
      errorCode: 'REFRESH_TOKEN_INVALID',
      statusCode: 401,
    })
  })

  it('throws REFRESH_TOKEN_INVALID when the user no longer exists', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null)
    const { refreshToken } = issueRefreshToken(user)

    await expect(verifyRefreshToken(refreshToken)).rejects.toMatchObject({
      errorCode: 'REFRESH_TOKEN_INVALID',
      statusCode: 401,
    })
  })
})
