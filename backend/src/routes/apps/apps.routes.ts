import type { FastifyInstance } from 'fastify'
import { listAppsHandler } from '../../controllers/apps/appsController'

export async function appsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/apps', listAppsHandler)
}
