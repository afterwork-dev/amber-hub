import { describe, it, expect, vi } from 'vitest'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { errorHandler } from '../errorHandler'
import { AppError } from '../../errors/AppError'

function createMockReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
  return reply as unknown as FastifyReply
}

describe('errorHandler', () => {
  it('maps an AppError onto the ApiResponse error envelope with its status code', () => {
    const reply = createMockReply()
    const error = new AppError('INTERNAL_ERROR', 'Something went wrong', 503)

    errorHandler(error, {} as FastifyRequest, reply)

    expect(reply.status).toHaveBeenCalledWith(503)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: { errorCode: 'INTERNAL_ERROR', errorMessage: 'Something went wrong' },
    })
  })

  it('includes error.details on the envelope when the AppError carries them', () => {
    const reply = createMockReply()
    const error = new AppError('VALIDATION_ERROR', 'Manifest invalid', 400, [
      'Missing required field: displayName',
    ])

    errorHandler(error, {} as FastifyRequest, reply)

    expect(reply.status).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Manifest invalid',
        details: ['Missing required field: displayName'],
      },
    })
  })

  it('maps an unexpected error onto a 500 with the generic INTERNAL_ERROR code', () => {
    const reply = createMockReply()
    const error = new Error('boom') as unknown as FastifyError

    errorHandler(error, {} as FastifyRequest, reply)

    expect(reply.status).toHaveBeenCalledWith(500)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: { errorCode: 'INTERNAL_ERROR', errorMessage: 'An unexpected error occurred' },
    })
  })
})
