import { parseDurationToSeconds } from './duration'

const ACCESS_TOKEN_COOKIE_NAME = 'accessToken'
const ACCESS_TOKEN_COOKIE_PATH = '/'

export function buildAccessTokenCookie(token: string, expiresIn: string, secure: boolean): string {
  const maxAgeSeconds = parseDurationToSeconds(expiresIn)

  const attributes = [
    `${ACCESS_TOKEN_COOKIE_NAME}=${token}`,
    `Path=${ACCESS_TOKEN_COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (secure) {
    attributes.push('Secure')
  }

  return attributes.join('; ')
}

export function parseCookieHeader(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined
  }

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }
    const key = part.slice(0, separatorIndex).trim()
    if (key === name) {
      return part.slice(separatorIndex + 1).trim()
    }
  }

  return undefined
}
