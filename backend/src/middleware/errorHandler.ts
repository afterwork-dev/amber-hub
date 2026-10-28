import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ErrorCodes, type ApiResponse } from '@amber-hub/shared'
import { AppError } from '../errors/AppError'

export function errorHandler(
  error: FastifyError | AppError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    const body: ApiResponse<never> = {
      success: false,
      data: null,
      error: {
        errorCode: error.errorCode,
        errorMessage: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    }
    reply.status(error.statusCode).send(body)
    return
  }

  const body: ApiResponse<never> = {
    success: false,
    data: null,
    error: {
      errorCode: ErrorCodes.INTERNAL_ERROR,
      errorMessage: 'An unexpected error occurred',
    },
  }
  reply.status(500).send(body)
}
