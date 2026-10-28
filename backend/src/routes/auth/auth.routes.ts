import type { FastifyInstance } from 'fastify'
import { loginHandler, refreshHandler, registerHandler } from '../../controllers/auth/authController'

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/auth/register', registerHandler)
  fastify.post('/auth/login', loginHandler)
  fastify.post('/auth/refresh', refreshHandler)
}
