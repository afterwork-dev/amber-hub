export type BackupStatus = 'in_progress' | 'ready' | 'failed'

export interface Backup {
  id: string
  status: BackupStatus
  createdAt: Date
  completedAt: Date | null
  createdByUsername: string
  sizeBytes: number | null
  errorMessage: string | null
}
