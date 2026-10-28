import type { ObjectId } from 'mongodb'

export interface ApiKeyDocument {
  _id: ObjectId
  userId: ObjectId
  description: string
  keyHash: string
  createdAt: Date
  expiresAt: Date
}
