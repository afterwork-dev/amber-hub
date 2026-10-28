import type { FastifyInstance } from 'fastify'
import {
  createApiKeyHandler,
  deleteApiKeyHandler,
  listApiKeysHandler,
} from '../../controllers/apiKeys/apiKeysController'

export async function apiKeysRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api-keys', listApiKeysHandler)
  fastify.post('/api-keys', createApiKeyHandler)
  fastify.delete('/api-keys/:id', deleteApiKeyHandler)
}
