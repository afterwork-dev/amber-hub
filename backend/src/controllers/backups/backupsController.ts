import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiResponse } from '@amber-hub/shared'
import {
  createBackup,
  deleteBackup,
  listBackups,
  openBackupDownload,
} from '../../services/backups/backupService'
import type { Backup, BackupStatus } from '../../services/backups/backup.types'

interface BackupSummary {
  id: string
  status: BackupStatus
  createdAt: string
  completedAt: string | null
  createdByUsername: string
  sizeBytes: number | null
  errorMessage: string | null
}

function toSummary(backup: Backup): BackupSummary {
  return {
    id: backup.id,
    status: backup.status,
    createdAt: backup.createdAt.toISOString(),
    completedAt: backup.completedAt?.toISOString() ?? null,
    createdByUsername: backup.createdByUsername,
    sizeBytes: backup.sizeBytes,
    errorMessage: backup.errorMessage,
  }
}

export async function createBackupHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const backup = await createBackup(request.user!.username)

  const body: ApiResponse<BackupSummary> = { success: true, data: toSummary(backup), error: null }
  reply.status(202).send(body)
}

export async function listBackupsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const backups = await listBackups()

  const body: ApiResponse<{ backups: BackupSummary[] }> = {
    success: true,
    data: { backups: backups.map(toSummary) },
    error: null,
  }
  reply.status(200).send(body)
}

export async function deleteBackupHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  await deleteBackup(request.params.id)

  const body: ApiResponse<{ id: string }> = {
    success: true,
    data: { id: request.params.id },
    error: null,
  }
  reply.status(200).send(body)
}

export async function downloadBackupHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const download = await openBackupDownload(request.params.id)

  return reply
    .header('content-type', 'application/gzip')
    .header('content-length', download.sizeBytes)
    .header('content-disposition', `attachment; filename="${download.fileName}"`)
    .header('cache-control', 'no-store')
    .send(download.stream)
}
