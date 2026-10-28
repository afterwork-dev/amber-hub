import type { FastifyReply, FastifyRequest } from 'fastify'
import { ErrorCodes, type ApiResponse } from '@amber-hub/shared'

export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply): void {
  const body: ApiResponse<never> = {
    success: false,
    data: null,
    error: {
      errorCode: ErrorCodes.NOT_FOUND,
      errorMessage: 'Route not found',
    },
  }
  reply.status(404).send(body)
}
