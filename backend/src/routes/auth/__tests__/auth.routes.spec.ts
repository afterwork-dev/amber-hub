import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod: MongoMemoryServer
let server: FastifyInstance
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let getDb: (typeof import('../../../db/mongoClient'))['getDb']

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  const mongoClient = await import('../../../db/mongoClient')
  disconnectMongo = mongoClient.disconnectMongo
  getDb = mongoClient.getDb
  await mongoClient.connectMongo()

  const userRepository = await import('../../../repositories/user/userRepository')
  await userRepository.ensureIndexes()

  const { buildServer } = await import('../../../buildServer')
  const { authRoutes } = await import('../auth.routes')
  server = await buildServer()
  await server.register(authRoutes, { prefix: '/api' })
}, 60_000)

afterAll(async () => {
  await server.close()
  await disconnectMongo()
  await mongod.stop()
})

describe('POST /api/auth/register', () => {
  it('creates a new account and issues a session token, without the password hash', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'alice',
        password: 'correct-horse',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.error).toBeNull()
    expect(body.data).toEqual({
      username: 'alice',
      token: expect.any(String),
      expiresIn: expect.any(String),
      refreshToken: expect.any(String),
      refreshExpiresIn: expect.any(String),
    })
  })

  it('rejects a second registration with the same username (case-insensitive) with 409 USERNAME_TAKEN', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'Bob',
        password: 'correct-horse',
      },
    })

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'bob',
        password: 'another-password',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        errorCode: 'USERNAME_TAKEN',
        errorMessage: 'This username is already taken',
      },
    })

    const count = await getDb().collection('users').countDocuments({ usernameNormalized: 'bob' })
    expect(count).toBe(1)
  })

  it('rejects a password shorter than 8 characters with 400 VALIDATION_ERROR', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'dave',
        password: 'short',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Password must be at least 8 characters',
      },
    })

    const count = await getDb().collection('users').countDocuments({ usernameNormalized: 'dave' })
    expect(count).toBe(0)
  })

  it('is reachable with no Authorization header (exempt from the global auth requirement)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'grace', password: 'correct-horse' },
    })

    expect(response.statusCode).toBe(201)
  })
})

describe('POST /api/auth/login', () => {
  it('issues a token for correct credentials', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'erin', password: 'correct-horse' },
    })

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'erin', password: 'correct-horse' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.error).toBeNull()
    expect(body.data.username).toBe('erin')
    expect(typeof body.data.token).toBe('string')
    expect(body.data.token.split('.')).toHaveLength(3)
    expect(body.data.expiresIn).toBe('15m')
    expect(body.data.refreshToken.split('.')).toHaveLength(3)
    expect(body.data.refreshExpiresIn).toBe('7d')
  })

  it('rejects an unregistered username with 401 INVALID_CREDENTIALS', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'does-not-exist', password: 'correct-horse' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid username or password',
      },
    })
  })

  it('rejects a wrong password with the identical 401 INVALID_CREDENTIALS response', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'frank', password: 'correct-horse' },
    })

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'frank', password: 'wrong-password' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid username or password',
      },
    })
  })

  it('is reachable with no Authorization header (exempt from the global auth requirement)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'does-not-exist', password: 'correct-horse' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('INVALID_CREDENTIALS')
  })
})

describe('POST /api/auth/refresh', () => {
  it('exchanges a valid refresh token for a fresh access+refresh token pair', async () => {
    const registerResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'heidi', password: 'correct-horse' },
    })
    const { refreshToken: originalRefreshToken } = registerResponse.json().data

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: originalRefreshToken },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.username).toBe('heidi')
    expect(typeof body.data.token).toBe('string')
    expect(typeof body.data.refreshToken).toBe('string')
  })

  it('allows the same refresh token to be used again (no rotation enforcement, by design)', async () => {
    const registerResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'ivan', password: 'correct-horse' },
    })
    const { refreshToken } = registerResponse.json().data

    await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    })
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    })

    expect(secondResponse.statusCode).toBe(200)
    expect(secondResponse.json().data.username).toBe('ivan')
  })

  it('returns 401 REFRESH_TOKEN_INVALID when given a valid access token instead of a refresh token', async () => {
    const registerResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'judy', password: 'correct-horse' },
    })
    const { token } = registerResponse.json().data

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: token },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('REFRESH_TOKEN_INVALID')
  })

  it('returns 400 VALIDATION_ERROR when refreshToken is missing', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.errorCode).toBe('VALIDATION_ERROR')
  })

  it('returns 401 REFRESH_TOKEN_INVALID for an unknown token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'never-issued' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: {
        errorCode: 'REFRESH_TOKEN_INVALID',
        errorMessage: 'This session can no longer be renewed. Please sign in again.',
      },
    })
  })

  it('is reachable with no Authorization header (exempt from the global auth requirement)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'never-issued' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('REFRESH_TOKEN_INVALID')
  })
})
