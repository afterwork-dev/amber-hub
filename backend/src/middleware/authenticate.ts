import type { FastifyRequest } from 'fastify'
import { AppError } from '../errors/AppError'
import { KEY_PREFIX, verifyApiKey } from '../services/apiKeys/apiKeyService'
import { verifyAccessToken } from '../services/auth/tokenService'
import { parseCookieHeader } from '../utils/cookies'

const AUTH_PATH_PREFIX = '/api/auth/'
const RESOURCES_PATH_PREFIX = '/resources/'
const APP_API_PATH_PREFIX = '/app-api/'
const MCP_PATH_PREFIX = '/mcp'

type AuthenticatedUser = { id: string; username: string }

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return null
  }
  return header.slice('Bearer '.length)
}

async function verifyApiKeyBearer(bearer: string): Promise<AuthenticatedUser | null> {
  if (!bearer.startsWith(KEY_PREFIX)) {
    return null
  }
  try {
    return await verifyApiKey(bearer)
  } catch {
    return null
  }
}

async function verifyBearer(bearer: string): Promise<AuthenticatedUser | null> {
  try {
    return bearer.startsWith(KEY_PREFIX) ? await verifyApiKey(bearer) : verifyAccessToken(bearer)
  } catch {
    return null
  }
}

function verifyCookie(cookieToken: string | undefined): AuthenticatedUser | null {
  if (!cookieToken) {
    return null
  }
  try {
    return verifyAccessToken(cookieToken)
  } catch {
    return null
  }
}

function unauthorized(): AppError {
  return new AppError('UNAUTHORIZED', 'Authentication required', 401)
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  if (request.url.startsWith(AUTH_PATH_PREFIX)) {
    return
  }

  const bearer = extractBearerToken(request)

  if (request.url.startsWith(MCP_PATH_PREFIX)) {
    const keyUser = bearer ? await verifyApiKeyBearer(bearer) : null
    if (keyUser) {
      request.user = keyUser
      return
    }
    throw unauthorized()
  }

  const bearerUser = bearer ? await verifyBearer(bearer) : null
  if (bearerUser) {
    request.user = bearerUser
    return
  }

  const acceptsCookie =
    request.url.startsWith(RESOURCES_PATH_PREFIX) || request.url.startsWith(APP_API_PATH_PREFIX)
  if (acceptsCookie) {
    const cookieUser = verifyCookie(parseCookieHeader(request.headers.cookie, 'accessToken'))
    if (cookieUser) {
      request.user = cookieUser
      return
    }
  }

  throw unauthorized()
}
