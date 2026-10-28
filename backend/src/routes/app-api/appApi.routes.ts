import type { FastifyInstance } from 'fastify'
import { appApiHandler } from '../../controllers/app-api/appApiController'

export async function appApiRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.all('/:appId/*', appApiHandler)
}
