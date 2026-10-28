import { describe, it, expect } from 'vitest'
import { buildAccessTokenCookie, parseCookieHeader } from '../cookies'

describe('buildAccessTokenCookie', () => {
  it('builds a cookie string with the token, Path=/, HttpOnly, SameSite=Lax, and Max-Age', () => {
    const cookie = buildAccessTokenCookie('jwt-token', '15m', false)

    expect(cookie).toBe('accessToken=jwt-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=900')
  })

  it('appends Secure when the request arrived over HTTPS', () => {
    const cookie = buildAccessTokenCookie('jwt-token', '15m', true)

    expect(cookie).toBe(
      'accessToken=jwt-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=900; Secure',
    )
  })
})

describe('parseCookieHeader', () => {
  it('extracts the named cookie value from a multi-cookie header', () => {
    expect(parseCookieHeader('foo=bar; accessToken=jwt-token; baz=qux', 'accessToken')).toBe(
      'jwt-token',
    )
  })

  it('returns undefined when the named cookie is absent', () => {
    expect(parseCookieHeader('foo=bar', 'accessToken')).toBeUndefined()
  })

  it('returns undefined when the header is undefined', () => {
    expect(parseCookieHeader(undefined, 'accessToken')).toBeUndefined()
  })
})
