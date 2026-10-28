import { ObjectId, type Collection, type Document, type Filter } from 'mongodb'
import { getDb } from '../../db/mongoClient'
import type { StorableValue, StorageFilter, StoredRecord } from '../../services/appStorage/appStorage.types'

/** A filter that can never match — used when an id filter is not a valid identifier. */
const MATCHES_NOTHING = Symbol('matches-nothing')

function appDataCollection(physicalName: string): Collection<Document> {
  return getDb().collection(physicalName)
}

function toDomain(document: Document): StoredRecord {
  const { _id, ...fields } = document
  return { id: (_id as ObjectId).toString(), ...(fields as Record<string, StorableValue>) }
}

function toMongoFilter(filter: StorageFilter): Filter<Document> | typeof MATCHES_NOTHING {
  const mongoFilter: Filter<Document> = {}

  for (const [key, value] of Object.entries(filter)) {
    if (key !== 'id') {
      Object.assign(mongoFilter, { [key]: value })
      continue
    }
    if (typeof value !== 'string' || !ObjectId.isValid(value)) {
      return MATCHES_NOTHING
    }
    Object.assign(mongoFilter, { _id: new ObjectId(value) })
  }

  return mongoFilter
}

export async function insert(
  physicalName: string,
  fields: Record<string, StorableValue>,
): Promise<StoredRecord> {
  const document: Document = { ...fields, _id: new ObjectId() }
  await appDataCollection(physicalName).insertOne(document)
  return toDomain(document)
}

export async function replace(
  physicalName: string,
  id: string,
  fields: Record<string, StorableValue>,
): Promise<StoredRecord | null> {
  if (!ObjectId.isValid(id)) {
    return null
  }

  const _id = new ObjectId(id)
  const result = await appDataCollection(physicalName).replaceOne({ _id }, fields)
  return result.matchedCount === 0 ? null : toDomain({ ...fields, _id })
}

export async function find(physicalName: string, filter: StorageFilter): Promise<StoredRecord[]> {
  const mongoFilter = toMongoFilter(filter)
  if (mongoFilter === MATCHES_NOTHING) {
    return []
  }

  const documents = await appDataCollection(physicalName).find(mongoFilter).toArray()
  return documents.map(toDomain)
}

export async function deleteById(physicalName: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false
  }

  const result = await appDataCollection(physicalName).deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount === 1
}
