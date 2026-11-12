import { ObjectId, type Collection } from 'mongodb'
import { getDb } from '../../db/mongoClient'
import type { Backup } from '../../services/backups/backup.types'
import type { BackupDocument } from './backupDocument'

export const BACKUPS_COLLECTION = 'backups'

export class BackupInProgressError extends Error {
  constructor() {
    super('A backup is already in progress')
    this.name = 'BackupInProgressError'
  }
}

function backupsCollection(): Collection<BackupDocument> {
  return getDb().collection<BackupDocument>(BACKUPS_COLLECTION)
}

export async function ensureIndexes(): Promise<void> {
  await backupsCollection().createIndex(
    { status: 1 },
    { unique: true, partialFilterExpression: { status: 'in_progress' } },
  )
  await backupsCollection().createIndex({ createdAt: -1 })
}

export async function createInProgress(createdByUsername: string, createdAt: Date): Promise<Backup> {
  const document: BackupDocument = {
    _id: new ObjectId(),
    status: 'in_progress',
    createdAt,
    completedAt: null,
    createdByUsername,
    sizeBytes: null,
    errorMessage: null,
  }

  try {
    await backupsCollection().insertOne(document)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new BackupInProgressError()
    }
    throw error
  }

  return toDomain(document)
}

export async function findAll(): Promise<Backup[]> {
  const documents = await backupsCollection().find().sort({ createdAt: -1, _id: -1 }).toArray()
  return documents.map(toDomain)
}

export async function findById(id: string): Promise<Backup | null> {
  if (!ObjectId.isValid(id)) {
    return null
  }
  const document = await backupsCollection().findOne({ _id: new ObjectId(id) })
  return document ? toDomain(document) : null
}

export async function markReady(id: string, sizeBytes: number, completedAt: Date): Promise<void> {
  await backupsCollection().updateOne(
    { _id: new ObjectId(id), status: 'in_progress' },
    { $set: { status: 'ready', sizeBytes, completedAt } },
  )
}

export async function markFailed(id: string, errorMessage: string, completedAt: Date): Promise<void> {
  await backupsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'failed', errorMessage, completedAt, sizeBytes: null } },
  )
}

export async function markAllInProgressFailed(errorMessage: string, completedAt: Date): Promise<void> {
  await backupsCollection().updateMany(
    { status: 'in_progress' },
    { $set: { status: 'failed', errorMessage, completedAt } },
  )
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await backupsCollection().deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount === 1
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  )
}

function toDomain(document: BackupDocument): Backup {
  return {
    id: document._id.toString(),
    status: document.status,
    createdAt: document.createdAt,
    completedAt: document.completedAt,
    createdByUsername: document.createdByUsername,
    sizeBytes: document.sizeBytes,
    errorMessage: document.errorMessage,
  }
}
