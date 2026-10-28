import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { ObjectId } from 'mongodb'
import type { ApiKey } from '../../../services/apiKeys/apiKey.types'

let mongod: MongoMemoryServer
let connectMongo: (typeof import('../../../db/mongoClient'))['connectMongo']
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let getDb: (typeof import('../../../db/mongoClient'))['getDb']
let apiKeyRepository: typeof import('../apiKeyRepository')

function newApiKey(keyHash: string, userId = new ObjectId().toString()): ApiKey {
  const createdAt = new Date('2026-08-31T10:00:00.000Z')

  return {
    id: '',
    userId,
    description: 'CI pipeline',
    keyHash,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()

  const mongoClient = await import('../../../db/mongoClient')
  connectMongo = mongoClient.connectMongo
  disconnectMongo = mongoClient.disconnectMongo
  getDb = mongoClient.getDb
  apiKeyRepository = await import('../apiKeyRepository')

  await connectMongo()
  await apiKeyRepository.ensureIndexes()
}, 60_000)

afterAll(async () => {
  await disconnectMongo()
  await mongod.stop()
})

describe('apiKeyRepository.create', () => {
  it('inserts an api key and returns it with a generated id', async () => {
    const created = await apiKeyRepository.create(newApiKey('hash-a'))

    expect(created.id).toBeTruthy()
    expect(created.description).toBe('CI pipeline')
    expect(created.keyHash).toBe('hash-a')
    expect(created.createdAt).toBeInstanceOf(Date)
    expect(created.expiresAt.getTime()).toBeGreaterThan(created.createdAt.getTime())
  })

  it('stores the owner as an ObjectId and returns it as a string', async () => {
    const userId = new ObjectId().toString()

    const created = await apiKeyRepository.create(newApiKey('hash-b', userId))
    const stored = await getDb().collection('apiKeys').findOne({ keyHash: 'hash-b' })

    expect(created.userId).toBe(userId)
    expect(stored?.userId).toBeInstanceOf(ObjectId)
    expect(stored?.userId.toString()).toBe(userId)
  })

  it('rejects a second insert with the same key hash', async () => {
    await apiKeyRepository.create(newApiKey('hash-duplicate'))

    await expect(apiKeyRepository.create(newApiKey('hash-duplicate'))).rejects.toThrow()
  })
})

describe('apiKeyRepository.findByKeyHash', () => {
  it('returns the mapped domain object for a stored hash', async () => {
    const userId = new ObjectId().toString()
    await apiKeyRepository.create(newApiKey('hash-lookup', userId))

    const found = await apiKeyRepository.findByKeyHash('hash-lookup')

    expect(found?.id).toBeTruthy()
    expect(found?.userId).toBe(userId)
    expect(found?.keyHash).toBe('hash-lookup')
    expect(found?.expiresAt).toBeInstanceOf(Date)
  })

  it('returns null when no key matches the hash', async () => {
    expect(await apiKeyRepository.findByKeyHash('hash-absent')).toBeNull()
  })
})

describe('apiKeyRepository.ensureIndexes', () => {
  it('creates a unique index on keyHash and an index on userId', async () => {
    const indexes = await getDb().collection('apiKeys').indexes()

    const keyHashIndex = indexes.find((index) => index.key.keyHash === 1)
    const userIdIndex = indexes.find((index) => index.key.userId === 1)

    expect(keyHashIndex?.unique).toBe(true)
    expect(userIdIndex).toBeDefined()
  })
})

describe('apiKeyRepository.findByUserId', () => {
  it('returns only the requested user’s keys, newest first', async () => {
    const userId = new ObjectId().toString()
    const other = new ObjectId().toString()

    await apiKeyRepository.create({
      ...newApiKey('hash-older', userId),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    await apiKeyRepository.create({
      ...newApiKey('hash-newer', userId),
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    })
    await apiKeyRepository.create(newApiKey('hash-other-user', other))

    const found = await apiKeyRepository.findByUserId(userId)

    expect(found.map((apiKey) => apiKey.keyHash)).toEqual(['hash-newer', 'hash-older'])
    expect(found.every((apiKey) => apiKey.userId === userId)).toBe(true)
  })

  it('returns an empty array for a user with no keys', async () => {
    expect(await apiKeyRepository.findByUserId(new ObjectId().toString())).toEqual([])
  })
})

describe('apiKeyRepository.deleteByIdForUser', () => {
  it('deletes a key owned by the user and returns true', async () => {
    const userId = new ObjectId().toString()
    const created = await apiKeyRepository.create(newApiKey('hash-del', userId))

    const removed = await apiKeyRepository.deleteByIdForUser(created.id, userId)

    expect(removed).toBe(true)
    expect(await apiKeyRepository.findByKeyHash('hash-del')).toBeNull()
  })

  it('does not delete another user’s key and returns false', async () => {
    const owner = new ObjectId().toString()
    const other = new ObjectId().toString()
    const created = await apiKeyRepository.create(newApiKey('hash-keep', owner))

    const removed = await apiKeyRepository.deleteByIdForUser(created.id, other)

    expect(removed).toBe(false)
    expect(await apiKeyRepository.findByKeyHash('hash-keep')).not.toBeNull()
  })

  it('returns false for an unknown id', async () => {
    const removed = await apiKeyRepository.deleteByIdForUser(
      new ObjectId().toString(),
      new ObjectId().toString(),
    )

    expect(removed).toBe(false)
  })
})
