import { AppError } from '../../errors/AppError'
import * as appDataRepository from '../../repositories/appData/appDataRepository'
import type {
  StorableRecord,
  StorableValue,
  StorageFilter,
  StorageRequest,
  StorageResult,
  StoredRecord,
} from './appStorage.types'

const COLLECTION_NAME_PATTERN = /^[a-z][a-z0-9-]{0,39}$/

/** Guards against circular structures and absurd nesting in one rule. */
const MAX_VALUE_DEPTH = 20

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value) as object | null
  return prototype === Object.prototype || prototype === null
}

function isValidFieldKey(key: string): boolean {
  return !key.startsWith('$') && !key.includes('.')
}

function isStorableValue(value: unknown, depth = 0): boolean {
  if (depth > MAX_VALUE_DEPTH) {
    return false
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isStorableValue(entry, depth + 1))
  }
  if (isPlainObject(value)) {
    return Object.entries(value).every(
      ([key, entry]) => isValidFieldKey(key) && isStorableValue(entry, depth + 1),
    )
  }
  return false
}

export function assertValidCollectionName(collectionName: unknown): asserts collectionName is string {
  if (typeof collectionName !== 'string' || !COLLECTION_NAME_PATTERN.test(collectionName)) {
    throw new AppError(
      'APP_STORAGE_INVALID_COLLECTION_NAME',
      `Collection name ${JSON.stringify(collectionName)} must match ^[a-z][a-z0-9-]{0,39}$.`,
      400,
    )
  }
}

export function assertValidRecord(record: unknown): asserts record is StorableRecord {
  if (!isPlainObject(record)) {
    throw new AppError('APP_STORAGE_INVALID_RECORD', 'A record must be a plain object.', 400)
  }
  if ('id' in record && typeof record.id !== 'string') {
    throw new AppError('APP_STORAGE_INVALID_RECORD', 'The record field "id" must be a string.', 400)
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === '_id' || !isValidFieldKey(key)) {
      throw new AppError(
        'APP_STORAGE_INVALID_RECORD',
        `Record field "${key}" is reserved: field names must not be "_id", start with "$", or contain ".".`,
        400,
      )
    }
    if (key !== 'id' && !isStorableValue(value)) {
      throw new AppError(
        'APP_STORAGE_INVALID_RECORD',
        `Record field "${key}" is not JSON-serializable — store plain objects, arrays, strings, finite numbers, booleans, or null.`,
        400,
      )
    }
  }
}

export function assertValidFilter(filter: unknown): asserts filter is StorageFilter | undefined {
  if (filter === undefined) {
    return
  }
  if (!isPlainObject(filter)) {
    throw new AppError('APP_STORAGE_INVALID_FILTER', 'A filter must be a plain object.', 400)
  }

  for (const [key, value] of Object.entries(filter)) {
    if (key === '_id' || !isValidFieldKey(key)) {
      throw new AppError(
        'APP_STORAGE_INVALID_FILTER',
        `Filter key "${key}" is reserved: keys must not be "_id", start with "$", or contain ".".`,
        400,
      )
    }
    if (!isPrimitiveFilterValue(value)) {
      throw new AppError(
        'APP_STORAGE_INVALID_FILTER',
        `Filter value for "${key}" must be a string, finite number, boolean, or null.`,
        400,
      )
    }
  }
}

function isPrimitiveFilterValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true
  }
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * The one place a physical collection name is derived. `appId` always comes from the Hub's own
 * record of the calling app — never from anything the app sent.
 */
export function toPhysicalCollectionName(appId: string, collectionName: string): string {
  return `app_${appId}_${collectionName}`
}

async function runRepositoryOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new AppError(
      'APP_STORAGE_UNAVAILABLE',
      error instanceof Error ? error.message : 'App storage is currently unavailable.',
      502,
    )
  }
}

async function storeRecord(physicalName: string, record: unknown): Promise<StoredRecord> {
  assertValidRecord(record)
  const { id, ...fields } = record as StorableRecord & Record<string, StorableValue>

  if (id === undefined) {
    return runRepositoryOperation(() => appDataRepository.insert(physicalName, fields))
  }

  const replaced = await runRepositoryOperation(() =>
    appDataRepository.replace(physicalName, id, fields),
  )
  if (!replaced) {
    throw new AppError(
      'APP_STORAGE_RECORD_NOT_FOUND',
      `No record with id "${id}" exists in this collection.`,
      404,
    )
  }
  return replaced
}

async function queryRecords(physicalName: string, filter: unknown): Promise<StoredRecord[]> {
  assertValidFilter(filter)
  return runRepositoryOperation(() => appDataRepository.find(physicalName, filter ?? {}))
}

async function removeRecord(physicalName: string, id: unknown): Promise<null> {
  const deleted =
    typeof id === 'string' &&
    (await runRepositoryOperation(() => appDataRepository.deleteById(physicalName, id)))

  if (!deleted) {
    throw new AppError(
      'APP_STORAGE_RECORD_NOT_FOUND',
      `No record with id ${JSON.stringify(id)} exists in this collection.`,
      404,
    )
  }
  return null
}

/**
 * Executes one storage request for an app. `appId` is the Hub's own record of which app sent the
 * request — it never comes from the request payload, which is what keeps apps isolated.
 */
export async function executeStorageRequest(
  appId: string,
  request: StorageRequest,
): Promise<StorageResult> {
  assertValidCollectionName(request.collectionName)
  const physicalName = toPhysicalCollectionName(appId, request.collectionName)

  switch (request.operation) {
    case 'store':
      return storeRecord(physicalName, request.record)
    case 'query':
      return queryRecords(physicalName, request.filter)
    case 'remove':
      return removeRecord(physicalName, request.id)
    default:
      throw new AppError(
        'APP_STORAGE_UNAVAILABLE',
        `Unknown storage operation ${JSON.stringify(request.operation)}.`,
        502,
      )
  }
}
