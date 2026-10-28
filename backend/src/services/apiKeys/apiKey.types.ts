export interface ApiKey {
  id: string
  userId: string
  description: string
  keyHash: string
  createdAt: Date
  expiresAt: Date
}
