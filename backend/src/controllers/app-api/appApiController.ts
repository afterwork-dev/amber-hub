import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiResponse } from '@amber-hub/shared'
import { forwardCall } from '../../services/appBackends/appBackendManager'

export async function appApiHandler(
  request: FastifyRequest<{ Params: { appId: string; '*': string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { appId } = request.params
  const path = `/${request.params['*']}`

  const result = await forwardCall(appId, {
    method: request.method,
    path,
    query: request.query as Record<string, string>,
    body: request.body,
    user: request.user!,
  })

  const body: ApiResponse<unknown> = {
    success: true,
    data: result.body,
    error: null,
  }
  reply.status(result.status).send(body)
}
