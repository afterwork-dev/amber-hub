import type { ObjectId } from 'mongodb'

export interface UserDocument {
  _id: ObjectId
  username: string
  usernameNormalized: string
  passwordHash: string
  createdAt: Date
}
