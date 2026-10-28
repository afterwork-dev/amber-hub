import { ObjectId, type Collection } from 'mongodb'
import { getDb } from '../../db/mongoClient'
import type { User } from '../../services/user/user.types'
import type { UserDocument } from './userDocument'

export class UserAlreadyExistsError extends Error {
  constructor() {
    super('A user with this username already exists')
    this.name = 'UserAlreadyExistsError'
  }
}

function usersCollection(): Collection<UserDocument> {
  return getDb().collection<UserDocument>('users')
}

export async function ensureIndexes(): Promise<void> {
  await usersCollection().createIndex({ usernameNormalized: 1 }, { unique: true })
}

export async function create(user: User): Promise<User> {
  const document: UserDocument = {
    _id: new ObjectId(),
    username: user.username,
    usernameNormalized: user.username.toLowerCase(),
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
  }

  try {
    await usersCollection().insertOne(document)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new UserAlreadyExistsError()
    }
    throw error
  }

  return toDomain(document)
}

export async function findByUsernameNormalized(username: string): Promise<User | null> {
  const document = await usersCollection().findOne({ usernameNormalized: username.toLowerCase() })
  return document ? toDomain(document) : null
}

export async function findById(id: string): Promise<User | null> {
  if (!ObjectId.isValid(id)) {
    return null
  }
  const document = await usersCollection().findOne({ _id: new ObjectId(id) })
  return document ? toDomain(document) : null
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  )
}

function toDomain(document: UserDocument): User {
  return {
    id: document._id.toString(),
    username: document.username,
    passwordHash: document.passwordHash,
    createdAt: document.createdAt,
  }
}
