import { httpDelete, httpGet, httpPost } from './httpClient'

export type ValidityDays = 30 | 60 | 90

export interface CreateApiKeyInput {
  description?: string
  validityDays: ValidityDays
}

export interface ApiKeySummary {
  id: string
  description: string
  createdAt: string
  expiresAt: string
}

export interface CreatedApiKey extends ApiKeySummary {
  /** Plaintext key — shown to the user once and never stored. */
  key: string
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  return httpPost<CreatedApiKey>('/api-keys', input)
}

export async function listApiKeys(): Promise<ApiKeySummary[]> {
  const result = await httpGet<{ apiKeys: ApiKeySummary[] }>('/api-keys')
  return result.apiKeys
}

export async function deleteApiKey(id: string): Promise<void> {
  await httpDelete<{ id: string }>(`/api-keys/${id}`)
}
