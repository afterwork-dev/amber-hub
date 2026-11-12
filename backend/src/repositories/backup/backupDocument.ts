import type { ObjectId } from 'mongodb'
import type { BackupStatus } from '../../services/backups/backup.types'

export interface BackupDocument {
  _id: ObjectId
  status: BackupStatus
  createdAt: Date
  completedAt: Date | null
  createdByUsername: string
  sizeBytes: number | null
  errorMessage: string | null
}
