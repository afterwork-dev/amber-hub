import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { authenticate } from '../authenticate'
import { errorHandler } from '../errorHandler'
import { AppError } from '../../errors/AppError'
import { verifyApiKey } from '../../services/apiKeys/apiKeyService'

vi.mock('../../services/apiKeys/apiKeyService', () => ({
  KEY_PREFIX: 'ahk_',
  verifyApiKey: vi.fn(),
}))

const mockedVerifyApiKey = vi.mocked(verifyApiKey)
const originalJwtSecret = process.env.JWT_SECRET

async function buildTestServer(): Promise<FastifyInstance> {
  const server = Fastify()
  server.setErrorHandler(errorHandler)
  server.addHook('onRequest', authenticate)
  server.get('/api/apps', async () => ({ ok: true }))
  server.get('/api/auth/login', async () => ({ ok: true }))
  return server
}

describe('authenticate hook', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret'
    mockedVerifyApiKey.mockReset()
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret
  })

  it('authenticates an /api/ request with an ahk_ API key via verifyApiKey', async () => {
    mockedVerifyApiKey.mockResolvedValue({ id: 'key-user', username: 'svc' })
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/api/apps', async (request) => ({ user: request.user }))

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: 'Bearer ahk_secret-value' },
    })

    expect(mockedVerifyApiKey).toHaveBeenCalledWith('ahk_secret-value')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user: { id: 'key-user', username: 'svc' } })
  })

  it('routes a non-ahk_ bearer through JWT verification, not verifyApiKey', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/api/apps', async (request) => ({ user: request.user }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', {
      subject: 'user-1',
    })

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(mockedVerifyApiKey).not.toHaveBeenCalled()
    expect(response.json()).toEqual({ user: { id: 'user-1', username: 'alice' } })
  })

  it('rejects an /api/ request whose API key fails verification', async () => {
    mockedVerifyApiKey.mockRejectedValue(new AppError('UNAUTHORIZED', 'Authentication required', 401))
    const server = await buildTestServer()

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: 'Bearer ahk_bad-key' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('rejects a protected request with no Authorization header', async () => {
    const server = await buildTestServer()

    const response = await server.inject({ method: 'GET', url: '/api/apps' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: { errorCode: 'UNAUTHORIZED', errorMessage: 'Authentication required' },
    })
  })

  it('rejects a protected request with a malformed Authorization header', async () => {
    const server = await buildTestServer()

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: 'not-a-bearer-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('rejects a protected request signed with the wrong secret', async () => {
    const server = await buildTestServer()
    const token = jwt.sign({ username: 'alice' }, 'wrong-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('rejects a protected request with an expired token', async () => {
    const server = await buildTestServer()
    const token = jwt.sign({ username: 'alice' }, 'test-secret', {
      subject: 'user-1',
      expiresIn: '-1s',
    })

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('allows a protected request with a valid access token and attaches request.user', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/api/apps', async (request) => ({ user: request.user }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', {
      subject: 'user-1',
    })

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user: { id: 'user-1', username: 'alice' } })
  })

  it('rejects a refresh-type token presented as an access token', async () => {
    const server = await buildTestServer()
    const token = jwt.sign({ type: 'refresh' }, 'test-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('skips verification entirely for /api/auth/ requests, even with no header', async () => {
    const server = await buildTestServer()

    const response = await server.inject({ method: 'GET', url: '/api/auth/login' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })
  })

  it('leaves the public /api/auth/ path public even when an API key is presented', async () => {
    const server = await buildTestServer()

    const response = await server.inject({
      method: 'GET',
      url: '/api/auth/login',
      headers: { authorization: 'Bearer ahk_ignored-on-public-path' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })
    expect(mockedVerifyApiKey).not.toHaveBeenCalled()
  })

  it('yields equivalent request.user for a valid JWT and a valid API key on /api/', async () => {
    mockedVerifyApiKey.mockResolvedValue({ id: 'user-1', username: 'alice' })
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/api/apps', async (request) => ({ user: request.user }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', {
      subject: 'user-1',
    })

    const viaJwt = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: `Bearer ${token}` },
    })
    const viaKey = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { authorization: 'Bearer ahk_valid-key' },
    })

    expect(viaKey.json()).toEqual(viaJwt.json())
    expect(viaKey.json()).toEqual({ user: { id: 'user-1', username: 'alice' } })
  })

  it('rejects a /resources/ request with no accessToken cookie', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/resources/widget-app/frontend/index.js', async () => ({ ok: true }))

    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/index.js',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('rejects a /resources/ request whose accessToken cookie is invalid', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/resources/widget-app/frontend/index.js', async () => ({ ok: true }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'wrong-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/index.js',
      headers: { cookie: `accessToken=${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('allows a /resources/ request with a valid accessToken cookie and attaches request.user', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/resources/widget-app/frontend/index.js', async (request) => ({ user: request.user }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/index.js',
      headers: { cookie: `accessToken=${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user: { id: 'user-1', username: 'alice' } })
  })

  it('rejects an /app-api/ request with no accessToken cookie', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/app-api/widget-app/whoami', async () => ({ ok: true }))

    const response = await server.inject({ method: 'GET', url: '/app-api/widget-app/whoami' })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('rejects an /app-api/ request whose accessToken cookie is invalid', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/app-api/widget-app/whoami', async () => ({ ok: true }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'wrong-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/widget-app/whoami',
      headers: { cookie: `accessToken=${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('allows an /app-api/ request with a valid accessToken cookie and attaches request.user', async () => {
    const server = Fastify()
    server.setErrorHandler(errorHandler)
    server.addHook('onRequest', authenticate)
    server.get('/app-api/widget-app/whoami', async (request) => ({ user: request.user }))
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/widget-app/whoami',
      headers: { cookie: `accessToken=${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ user: { id: 'user-1', username: 'alice' } })
  })

  it('does not accept a /resources/ accessToken cookie as authorization for /api/ routes', async () => {
    const server = await buildTestServer()
    const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', { subject: 'user-1' })

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: { cookie: `accessToken=${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })
})
