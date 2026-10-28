import type { FastifyInstance } from 'fastify'
import { getAppFileHandler } from '../../controllers/apps/appsController'

export async function resourcesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/:appId/frontend/*', getAppFileHandler)
}
