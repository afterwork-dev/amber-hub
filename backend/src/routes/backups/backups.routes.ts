import type { FastifyInstance } from 'fastify'
import {
  createBackupHandler,
  deleteBackupHandler,
  downloadBackupHandler,
  listBackupsHandler,
} from '../../controllers/backups/backupsController'

export async function backupsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/backups', listBackupsHandler)
  fastify.post('/backups', createBackupHandler)
  fastify.delete('/backups/:id', deleteBackupHandler)
  fastify.get('/backups/:id/download', { exposeHeadRoute: false }, downloadBackupHandler)
}
