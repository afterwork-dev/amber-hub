import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import type { User } from '../../../services/user/user.types'

let mongod: MongoMemoryServer
let connectMongo: (typeof import('../../../db/mongoClient'))['connectMongo']
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let userRepository: typeof import('../userRepository')

function newUser(username: string): User {
  return {
    id: '',
    username,
    passwordHash: 'hashed-password',
    createdAt: new Date(),
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()

  const mongoClient = await import('../../../db/mongoClient')
  connectMongo = mongoClient.connectMongo
  disconnectMongo = mongoClient.disconnectMongo
  userRepository = await import('../userRepository')

  await connectMongo()
  await userRepository.ensureIndexes()
}, 60_000)

afterAll(async () => {
  await disconnectMongo()
  await mongod.stop()
})

describe('userRepository.create', () => {
  it('inserts a user and returns it with a generated id', async () => {
    const created = await userRepository.create(newUser('alice'))

    expect(created.id).toBeTruthy()
    expect(created.username).toBe('alice')
    expect(created.passwordHash).toBe('hashed-password')
    expect(created.createdAt).toBeInstanceOf(Date)
  })

  it('rejects a second insert with the same username', async () => {
    await userRepository.create(newUser('bob'))

    await expect(userRepository.create(newUser('bob'))).rejects.toThrow(
      userRepository.UserAlreadyExistsError,
    )
  })

  it('rejects a second insert with a differently-cased username', async () => {
    await userRepository.create(newUser('Carol'))

    await expect(userRepository.create(newUser('carol'))).rejects.toThrow(
      userRepository.UserAlreadyExistsError,
    )
  })
})

describe('userRepository.findByUsernameNormalized', () => {
  it('finds an existing user case-insensitively', async () => {
    await userRepository.create(newUser('Dave'))

    const found = await userRepository.findByUsernameNormalized('dave')

    expect(found?.username).toBe('Dave')
    expect(found?.passwordHash).toBe('hashed-password')
  })

  it('returns null when no user matches', async () => {
    const found = await userRepository.findByUsernameNormalized('does-not-exist')

    expect(found).toBeNull()
  })
})

describe('userRepository.findById', () => {
  it('finds an existing user by id', async () => {
    const created = await userRepository.create(newUser('heidi'))

    const found = await userRepository.findById(created.id)

    expect(found?.username).toBe('heidi')
  })

  it('returns null when no user matches a well-formed id', async () => {
    const found = await userRepository.findById('507f1f77bcf86cd799439011')

    expect(found).toBeNull()
  })

  it('returns null for a malformed id instead of throwing', async () => {
    const found = await userRepository.findById('not-an-object-id')

    expect(found).toBeNull()
  })
})
