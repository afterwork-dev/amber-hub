import { apiUrl, httpDelete, httpGet, httpPost } from './httpClient'

export type BackupStatus = 'in_progress' | 'ready' | 'failed'

export interface BackupSummary {
  id: string
  status: BackupStatus
  createdAt: string
  completedAt: string | null
  createdByUsername: string
  sizeBytes: number | null
  errorMessage: string | null
}

export async function createBackup(): Promise<BackupSummary> {
  return httpPost<BackupSummary>('/backups', {})
}

export async function listBackups(): Promise<BackupSummary[]> {
  const result = await httpGet<{ backups: BackupSummary[] }>('/backups')
  return result.backups
}

export async function deleteBackup(id: string): Promise<void> {
  await httpDelete<{ id: string }>(`/backups/${id}`)
}

export function backupDownloadUrl(id: string): string {
  return apiUrl(`/backups/${id}/download`)
}
