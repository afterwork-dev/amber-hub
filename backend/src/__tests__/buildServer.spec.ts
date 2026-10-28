import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { buildServer } from '../buildServer'
import { AppError } from '../errors/AppError'
import type { FastifyInstance } from 'fastify'

const originalJwtSecret = process.env.JWT_SECRET

async function probeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/probe', async () => ({ ok: true }))
}

function authHeader(): { authorization: string } {
  const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', {
    subject: 'user-1',
  })
  return { authorization: `Bearer ${token}` }
}

describe('buildServer', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret
  })

  it('registers CORS headers on responses', async () => {
    const server = await buildServer()
    server.get('/probe', async () => ({ ok: true }))

    const response = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { origin: 'http://localhost:5173', ...authHeader() },
    })

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('allows credentialed cross-origin requests, so the browser stores/sends the resources cookie', async () => {
    const server = await buildServer()
    server.get('/probe', async () => ({ ok: true }))

    const response = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { origin: 'http://localhost:5173', ...authHeader() },
    })

    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('does not reflect back an origin other than the configured frontend origin', async () => {
    const server = await buildServer()
    server.get('/probe', async () => ({ ok: true }))

    const response = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: { origin: 'http://evil.example.com', ...authHeader() },
    })

    expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.example.com')
  })

  it('wires the errorHandler so AppErrors map to the ApiResponse envelope', async () => {
    const server = await buildServer()
    server.get('/boom', async () => {
      throw new AppError('INTERNAL_ERROR', 'boom', 503)
    })

    const response = await server.inject({ method: 'GET', url: '/boom', headers: authHeader() })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: { errorCode: 'INTERNAL_ERROR', errorMessage: 'boom' },
    })
  })

  it('exposes registered routes under the /api prefix, matching how index.ts registers them', async () => {
    const server = await buildServer()
    await server.register(probeRoutes, { prefix: '/api' })

    const response = await server.inject({
      method: 'GET',
      url: '/api/probe',
      headers: authHeader(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })
  })

  it('returns a 404 ApiResponse envelope for the old unprefixed path', async () => {
    const server = await buildServer()
    await server.register(probeRoutes, { prefix: '/api' })

    const response = await server.inject({
      method: 'GET',
      url: '/probe',
      headers: authHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: { errorCode: 'NOT_FOUND', errorMessage: 'Route not found' },
    })
  })

  it('returns a 404 ApiResponse envelope for any other unmatched route', async () => {
    const server = await buildServer()
    await server.register(probeRoutes, { prefix: '/api' })

    const response = await server.inject({
      method: 'GET',
      url: '/api/does-not-exist',
      headers: authHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: { errorCode: 'NOT_FOUND', errorMessage: 'Route not found' },
    })
  })

  it('returns a 401 ApiResponse envelope when no Authorization header is present, for a non-auth route', async () => {
    const server = await buildServer()
    await server.register(probeRoutes, { prefix: '/api' })

    const response = await server.inject({ method: 'GET', url: '/api/probe' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: { errorCode: 'UNAUTHORIZED', errorMessage: 'Authentication required' },
    })
  })
})
