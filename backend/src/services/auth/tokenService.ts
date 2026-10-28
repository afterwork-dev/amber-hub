import jwt from 'jsonwebtoken'
import { ErrorCodes } from '@amber-hub/shared'
import { getJwtExpiresIn, getJwtRefreshExpiresIn, getJwtSecret } from '../../config/env'
import { AppError } from '../../errors/AppError'
import * as userRepository from '../../repositories/user/userRepository'
import type { User } from '../user/user.types'

export interface IssuedToken {
  token: string
  expiresIn: string
}

export interface IssuedRefreshToken {
  refreshToken: string
  refreshExpiresIn: string
}

export interface AccessTokenPayload {
  id: string
  username: string
}

export function issueAccessToken(user: User): IssuedToken {
  const expiresIn = getJwtExpiresIn()

  const token = jwt.sign({ username: user.username, type: 'access' }, getJwtSecret(), {
    subject: user.id,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  })

  return { token, expiresIn }
}

export function issueRefreshToken(user: User): IssuedRefreshToken {
  const refreshExpiresIn = getJwtRefreshExpiresIn()

  const refreshToken = jwt.sign({ type: 'refresh' }, getJwtSecret(), {
    subject: user.id,
    expiresIn: refreshExpiresIn as jwt.SignOptions['expiresIn'],
  })

  return { refreshToken, refreshExpiresIn }
}

export function verifyAccessToken(rawToken: string): AccessTokenPayload {
  let decoded: jwt.JwtPayload
  try {
    decoded = jwt.verify(rawToken, getJwtSecret()) as jwt.JwtPayload
  } catch {
    throw invalidAccessTokenError()
  }

  if (decoded.type !== 'access' || typeof decoded.sub !== 'string') {
    throw invalidAccessTokenError()
  }

  return { id: decoded.sub, username: decoded.username as string }
}

export async function verifyRefreshToken(rawToken: string): Promise<User> {
  if (!rawToken) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'refreshToken is required', 400)
  }

  const userId = decodeRefreshTokenSubject(rawToken)
  const user = await userRepository.findById(userId)
  if (!user) {
    throw invalidRefreshTokenError()
  }

  return user
}

function decodeRefreshTokenSubject(rawToken: string): string {
  let decoded: jwt.JwtPayload
  try {
    decoded = jwt.verify(rawToken, getJwtSecret()) as jwt.JwtPayload
  } catch {
    throw invalidRefreshTokenError()
  }

  if (decoded.type !== 'refresh' || typeof decoded.sub !== 'string') {
    throw invalidRefreshTokenError()
  }

  return decoded.sub
}

function invalidRefreshTokenError(): AppError {
  return new AppError(
    ErrorCodes.REFRESH_TOKEN_INVALID,
    'This session can no longer be renewed. Please sign in again.',
    401,
  )
}

function invalidAccessTokenError(): AppError {
  return new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
}
