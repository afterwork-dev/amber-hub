import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { getFrontendOrigin } from './config/env'
import { authenticate } from './middleware/authenticate'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: true })

  await server.register(cors, { origin: getFrontendOrigin(), credentials: true })

  server.setErrorHandler(errorHandler)
  server.setNotFoundHandler(notFoundHandler)
  server.addHook('onRequest', authenticate)

  return server
}
