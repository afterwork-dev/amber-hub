import { ObjectId, type Collection } from 'mongodb'
import { getDb } from '../../db/mongoClient'
import type { ApiKey } from '../../services/apiKeys/apiKey.types'
import type { ApiKeyDocument } from './apiKeyDocument'

function apiKeysCollection(): Collection<ApiKeyDocument> {
  return getDb().collection<ApiKeyDocument>('apiKeys')
}

export async function ensureIndexes(): Promise<void> {
  await apiKeysCollection().createIndex({ keyHash: 1 }, { unique: true })
  await apiKeysCollection().createIndex({ userId: 1 })
}

export async function create(apiKey: ApiKey): Promise<ApiKey> {
  const document: ApiKeyDocument = {
    _id: new ObjectId(),
    userId: new ObjectId(apiKey.userId),
    description: apiKey.description,
    keyHash: apiKey.keyHash,
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt,
  }

  await apiKeysCollection().insertOne(document)

  return toDomain(document)
}

export async function findByKeyHash(keyHash: string): Promise<ApiKey | null> {
  const document = await apiKeysCollection().findOne({ keyHash })
  return document ? toDomain(document) : null
}

export async function findByUserId(userId: string): Promise<ApiKey[]> {
  const documents = await apiKeysCollection()
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray()

  return documents.map(toDomain)
}

export async function deleteByIdForUser(id: string, userId: string): Promise<boolean> {
  // userId is the ownership guard, not a lookup: it makes deleting another user's key impossible
  // by construction, so a cross-user id matches nothing and reads back as not-found.
  const result = await apiKeysCollection().deleteOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userId),
  })

  return result.deletedCount === 1
}

function toDomain(document: ApiKeyDocument): ApiKey {
  return {
    id: document._id.toString(),
    userId: document.userId.toString(),
    description: document.description,
    keyHash: document.keyHash,
    createdAt: document.createdAt,
    expiresAt: document.expiresAt,
  }
}
