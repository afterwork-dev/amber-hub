import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ObjectId } from 'mongodb'

let mongod: MongoMemoryServer
let server: FastifyInstance
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let getDb: (typeof import('../../../db/mongoClient'))['getDb']
let token: string

function authorized(payload: Record<string, unknown>) {
  return {
    method: 'POST' as const,
    url: '/api/api-keys',
    headers: { authorization: `Bearer ${token}` },
    payload,
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  const mongoClient = await import('../../../db/mongoClient')
  disconnectMongo = mongoClient.disconnectMongo
  getDb = mongoClient.getDb
  await mongoClient.connectMongo()

  const apiKeyRepository = await import('../../../repositories/apiKey/apiKeyRepository')
  await apiKeyRepository.ensureIndexes()

  const { issueAccessToken } = await import('../../../services/auth/tokenService')
  token = issueAccessToken({
    id: new ObjectId().toString(),
    username: 'alice',
    passwordHash: 'irrelevant',
    createdAt: new Date(),
  }).token

  const { buildServer } = await import('../../../buildServer')
  const { apiKeysRoutes } = await import('../apiKeys.routes')
  server = await buildServer()
  await server.register(apiKeysRoutes, { prefix: '/api' })
}, 60_000)

afterAll(async () => {
  await server.close()
  await disconnectMongo()
  await mongod.stop()
})

describe('POST /api/api-keys', () => {
  it('creates a key and returns the plaintext once, in the standard envelope', async () => {
    const response = await server.inject(authorized({ description: 'CI', validityDays: 30 }))

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.error).toBeNull()
    expect(body.data).toEqual({
      id: expect.any(String),
      key: expect.stringMatching(/^ahk_[A-Za-z0-9_-]{43}$/),
      description: 'CI',
      createdAt: expect.any(String),
      expiresAt: expect.any(String),
    })
  })

  it('defaults an omitted description to an empty string', async () => {
    const response = await server.inject(authorized({ validityDays: 90 }))

    expect(response.statusCode).toBe(201)
    expect(response.json().data.description).toBe('')
  })

  it('sets expiresAt the selected number of days after createdAt', async () => {
    const { data } = (await server.inject(authorized({ validityDays: 60 }))).json()

    const elapsed = Date.parse(data.expiresAt) - Date.parse(data.createdAt)
    expect(elapsed).toBe(60 * 24 * 60 * 60 * 1000)
  })

  it('stores only the hash of the key, never the plaintext', async () => {
    const { data } = (await server.inject(authorized({ validityDays: 30 }))).json()

    const stored = await getDb().collection('apiKeys').findOne({ _id: new ObjectId(data.id) })

    expect(stored?.keyHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(stored)).not.toContain(data.key)
  })

  it('persists exactly the sha256 digest of the revealed key', async () => {
    const { data } = (await server.inject(authorized({ validityDays: 30 }))).json()

    const stored = await getDb().collection('apiKeys').findOne({ _id: new ObjectId(data.id) })

    expect(stored?.keyHash).toBe(createHash('sha256').update(data.key).digest('hex'))
  })

  it('never returns the plaintext again: the list omits it and no per-key GET exists', async () => {
    const { data } = (await server.inject(authorized({ validityDays: 30 }))).json()

    const headers = { authorization: `Bearer ${token}` }
    const list = await server.inject({ method: 'GET', url: '/api/api-keys', headers })
    const item = await server.inject({ method: 'GET', url: `/api/api-keys/${data.id}`, headers })

    expect(list.statusCode).toBe(200)
    expect(item.statusCode).toBe(404)
    expect(list.body).not.toContain(data.key)
    expect(item.body).not.toContain(data.key)
  })

  it('rejects an invalid validity with 400 VALIDATION_ERROR', async () => {
    const response = await server.inject(authorized({ validityDays: 45 }))

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.data).toBeNull()
    expect(body.error.errorCode).toBe('VALIDATION_ERROR')
  })

  it('rejects a description longer than 200 characters with 400 VALIDATION_ERROR', async () => {
    const response = await server.inject(
      authorized({ description: 'x'.repeat(201), validityDays: 30 }),
    )

    expect(response.statusCode).toBe(400)
    expect(response.json().error.errorCode).toBe('VALIDATION_ERROR')
  })

  it('rejects an unauthenticated request with 401 and creates nothing', async () => {
    const before = await getDb().collection('apiKeys').countDocuments()

    const response = await server.inject({
      method: 'POST',
      url: '/api/api-keys',
      payload: { validityDays: 30 },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
    expect(await getDb().collection('apiKeys').countDocuments()).toBe(before)
  })

  it('creates nothing when validation fails', async () => {
    const before = await getDb().collection('apiKeys').countDocuments()

    await server.inject(authorized({ validityDays: 15 }))

    expect(await getDb().collection('apiKeys').countDocuments()).toBe(before)
  })
})

describe('API-key authentication on POST /api/api-keys', () => {
  const UNAUTHORIZED_ENVELOPE = {
    success: false,
    data: null,
    error: { errorCode: 'UNAUTHORIZED', errorMessage: 'Authentication required' },
  }

  function withKey(key: string) {
    return {
      method: 'POST' as const,
      url: '/api/api-keys',
      headers: { authorization: `Bearer ${key}` },
      payload: { validityDays: 30 },
    }
  }

  it('rejects unknown, malformed, and absent credentials identically to each other', async () => {
    const unknown = await server.inject(withKey('ahk_this-key-was-never-issued'))
    const malformed = await server.inject(withKey('ahk_'))
    const absent = await server.inject({
      method: 'POST',
      url: '/api/api-keys',
      payload: { validityDays: 30 },
    })

    for (const response of [unknown, malformed, absent]) {
      expect(response.statusCode).toBe(401)
      expect(response.json()).toEqual(UNAUTHORIZED_ENVELOPE)
    }
  })

  it('rejects an expired key with the same envelope, taking effect on the next request', async () => {
    const userRepository = await import('../../../repositories/user/userRepository')
    const user = await userRepository.create({
      id: '',
      username: 'expiry-user',
      passwordHash: 'irrelevant',
      createdAt: new Date(),
    })
    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    const { apiKey, key } = await createApiKey(user.id, { validityDays: 30 })

    const beforeExpiry = await server.inject(withKey(key))
    expect(beforeExpiry.statusCode).toBe(201)

    await getDb()
      .collection('apiKeys')
      .updateOne({ _id: new ObjectId(apiKey.id) }, { $set: { expiresAt: new Date(0) } })

    const afterExpiry = await server.inject(withKey(key))
    expect(afterExpiry.statusCode).toBe(401)
    expect(afterExpiry.json()).toEqual(UNAUTHORIZED_ENVELOPE)
  })
})

describe('GET /api/api-keys', () => {
  async function userWithToken(username: string): Promise<{ id: string; token: string }> {
    const { issueAccessToken } = await import('../../../services/auth/tokenService')
    const id = new ObjectId().toString()
    const issued = issueAccessToken({ id, username, passwordHash: 'x', createdAt: new Date() })
    return { id, token: issued.token }
  }

  it('returns the caller’s keys newest first, in the envelope, without hash or userId', async () => {
    const { id, token: userToken } = await userWithToken('lister')
    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    const first = await createApiKey(id, { description: 'first', validityDays: 30 })
    const second = await createApiKey(id, { description: 'second', validityDays: 60 })

    await getDb()
      .collection('apiKeys')
      .updateOne(
        { _id: new ObjectId(first.apiKey.id) },
        { $set: { createdAt: new Date('2020-01-01T00:00:00.000Z') } },
      )

    const response = await server.inject({
      method: 'GET',
      url: '/api/api-keys',
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.error).toBeNull()
    expect(body.data.apiKeys.map((apiKey: { id: string }) => apiKey.id)).toEqual([
      second.apiKey.id,
      first.apiKey.id,
    ])
    expect(body.data.apiKeys[0]).toEqual({
      id: second.apiKey.id,
      description: 'second',
      createdAt: expect.any(String),
      expiresAt: expect.any(String),
    })
    expect(JSON.stringify(body.data.apiKeys)).not.toContain('keyHash')
    expect(JSON.stringify(body.data.apiKeys)).not.toContain('userId')
  })

  it('returns only the caller’s own keys', async () => {
    const alice = await userWithToken('alice-list')
    const bob = await userWithToken('bob-list')
    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    const aliceKey = await createApiKey(alice.id, { validityDays: 30 })
    await createApiKey(bob.id, { validityDays: 30 })

    const response = await server.inject({
      method: 'GET',
      url: '/api/api-keys',
      headers: { authorization: `Bearer ${alice.token}` },
    })

    const ids = response.json().data.apiKeys.map((apiKey: { id: string }) => apiKey.id)
    expect(ids).toEqual([aliceKey.apiKey.id])
  })

  it('returns an empty list for a user with no keys', async () => {
    const fresh = await userWithToken('empty-list')

    const response = await server.inject({
      method: 'GET',
      url: '/api/api-keys',
      headers: { authorization: `Bearer ${fresh.token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toEqual({ apiKeys: [] })
  })

  it('rejects an unauthenticated list request with 401', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/api-keys' })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })
})

describe('DELETE /api/api-keys/:id', () => {
  const NOT_FOUND_ENVELOPE = {
    success: false,
    data: null,
    error: { errorCode: 'NOT_FOUND', errorMessage: 'API key not found' },
  }

  async function userWithToken(username: string): Promise<{ id: string; token: string }> {
    const { issueAccessToken } = await import('../../../services/auth/tokenService')
    const id = new ObjectId().toString()
    const issued = issueAccessToken({ id, username, passwordHash: 'x', createdAt: new Date() })
    return { id, token: issued.token }
  }

  it('deletes the caller’s own key and returns its id', async () => {
    const { id, token: userToken } = await userWithToken('deleter')
    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    const { apiKey } = await createApiKey(id, { validityDays: 30 })

    const response = await server.inject({
      method: 'DELETE',
      url: `/api/api-keys/${apiKey.id}`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true, data: { id: apiKey.id }, error: null })
    expect(await getDb().collection('apiKeys').findOne({ _id: new ObjectId(apiKey.id) })).toBeNull()
  })

  it('returns an identical 404 for another user’s key, an unknown id, and a malformed id', async () => {
    const alice = await userWithToken('alice-del')
    const bob = await userWithToken('bob-del')
    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    const { apiKey } = await createApiKey(alice.id, { validityDays: 30 })

    const bobHeaders = { authorization: `Bearer ${bob.token}` }
    const others = await server.inject({
      method: 'DELETE',
      url: `/api/api-keys/${apiKey.id}`,
      headers: bobHeaders,
    })
    const unknown = await server.inject({
      method: 'DELETE',
      url: `/api/api-keys/${new ObjectId().toString()}`,
      headers: bobHeaders,
    })
    const malformed = await server.inject({
      method: 'DELETE',
      url: '/api/api-keys/not-an-id',
      headers: bobHeaders,
    })

    for (const response of [others, unknown, malformed]) {
      expect(response.statusCode).toBe(404)
      expect(response.json()).toEqual(NOT_FOUND_ENVELOPE)
    }
    expect(
      await getDb().collection('apiKeys').findOne({ _id: new ObjectId(apiKey.id) }),
    ).not.toBeNull()
  })

  it('rejects an unauthenticated delete with 401', async () => {
    const response = await server.inject({
      method: 'DELETE',
      url: `/api/api-keys/${new ObjectId().toString()}`,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('rejects a deleted key on the next request, using the key itself as the credential', async () => {
    const userRepository = await import('../../../repositories/user/userRepository')
    const user = await userRepository.create({
      id: '',
      username: 'revoke-user',
      passwordHash: 'irrelevant',
      createdAt: new Date(),
    })
    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    const { apiKey, key } = await createApiKey(user.id, { validityDays: 30 })
    const withKey = { authorization: `Bearer ${key}` }

    const before = await server.inject({ method: 'GET', url: '/api/api-keys', headers: withKey })
    expect(before.statusCode).toBe(200)

    const del = await server.inject({
      method: 'DELETE',
      url: `/api/api-keys/${apiKey.id}`,
      headers: withKey,
    })
    expect(del.statusCode).toBe(200)

    const after = await server.inject({ method: 'GET', url: '/api/api-keys', headers: withKey })
    expect(after.statusCode).toBe(401)
  })
})
