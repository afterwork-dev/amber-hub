import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiResponse } from '@amber-hub/shared'
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  type CreateApiKeyInput,
} from '../../services/apiKeys/apiKeyService'
import type { ApiKey } from '../../services/apiKeys/apiKey.types'

interface ApiKeySummary {
  id: string
  description: string
  createdAt: string
  expiresAt: string
}

interface CreatedApiKeyResponse extends ApiKeySummary {
  key: string
}

function toSummary(apiKey: ApiKey): ApiKeySummary {
  return {
    id: apiKey.id,
    description: apiKey.description,
    createdAt: apiKey.createdAt.toISOString(),
    expiresAt: apiKey.expiresAt.toISOString(),
  }
}

export async function createApiKeyHandler(
  request: FastifyRequest<{ Body: CreateApiKeyInput }>,
  reply: FastifyReply,
): Promise<void> {
  const { apiKey, key } = await createApiKey(request.user!.id, request.body)

  const body: ApiResponse<CreatedApiKeyResponse> = {
    success: true,
    data: { ...toSummary(apiKey), key },
    error: null,
  }
  reply.status(201).send(body)
}

export async function listApiKeysHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKeys = await listApiKeys(request.user!.id)

  const body: ApiResponse<{ apiKeys: ApiKeySummary[] }> = {
    success: true,
    data: { apiKeys: apiKeys.map(toSummary) },
    error: null,
  }
  reply.status(200).send(body)
}

export async function deleteApiKeyHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  await deleteApiKey(request.user!.id, request.params.id)

  const body: ApiResponse<{ id: string }> = {
    success: true,
    data: { id: request.params.id },
    error: null,
  }
  reply.status(200).send(body)
}
