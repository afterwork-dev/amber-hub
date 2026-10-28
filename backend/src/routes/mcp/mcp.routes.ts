import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AppError } from '../../errors/AppError'
import { getFrontendOrigin } from '../../config/env'
import { mcpHandler } from '../../controllers/mcp/mcpController'

async function rejectForeignOrigin(request: FastifyRequest): Promise<void> {
  const origin = request.headers.origin
  if (origin !== undefined && origin !== getFrontendOrigin()) {
    throw new AppError('FORBIDDEN', 'Origin not allowed', 403)
  }
}

function methodNotAllowed(): never {
  throw new AppError('METHOD_NOT_ALLOWED', 'The MCP endpoint only accepts POST.', 405)
}

export async function mcpRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', rejectForeignOrigin)
  fastify.post('/', mcpHandler)
  fastify.get('/', methodNotAllowed)
  fastify.delete('/', methodNotAllowed)
}
