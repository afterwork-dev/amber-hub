import { describe, it, expect, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { notFoundHandler } from '../notFoundHandler'

function createMockReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
  return reply as unknown as FastifyReply
}

describe('notFoundHandler', () => {
  it('maps an unmatched route onto a 404 with the ApiResponse error envelope', () => {
    const reply = createMockReply()

    notFoundHandler({} as FastifyRequest, reply)

    expect(reply.status).toHaveBeenCalledWith(404)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: { errorCode: 'NOT_FOUND', errorMessage: 'Route not found' },
    })
  })
})
