import { MongoClient, type Db } from 'mongodb'
import { getMongodbUri } from '../config/env'

let client: MongoClient | null = null
let db: Db | null = null

export async function connectMongo(): Promise<void> {
  client = new MongoClient(getMongodbUri())
  await client.connect()
  db = client.db()
}

export async function disconnectMongo(): Promise<void> {
  await client?.close()
  client = null
  db = null
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB is not connected — call connectMongo() first')
  }
  return db
}
