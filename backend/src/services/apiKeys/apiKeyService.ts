import { createHash, randomBytes } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { ErrorCodes } from '@amber-hub/shared'
import { AppError } from '../../errors/AppError'
import * as apiKeyRepository from '../../repositories/apiKey/apiKeyRepository'
import * as userRepository from '../../repositories/user/userRepository'
import type { AccessTokenPayload } from '../auth/tokenService'
import type { ApiKey } from './apiKey.types'

export const KEY_PREFIX = 'ahk_'
const KEY_BYTES = 32
const MAX_DESCRIPTION_LENGTH = 200
const VALID_VALIDITY_DAYS = [30, 60, 90] as const
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ValidityDays = (typeof VALID_VALIDITY_DAYS)[number]

export interface CreateApiKeyInput {
  description?: string
  validityDays: ValidityDays
}

// The only moment the plaintext key exists: it is returned to the caller and never persisted.
export interface CreatedApiKey {
  apiKey: ApiKey
  key: string
}

export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput,
): Promise<CreatedApiKey> {
  const description = validate(input)

  const key = generateKey()
  const createdAt = new Date()

  const apiKey = await apiKeyRepository.create({
    id: '',
    userId,
    description,
    keyHash: hashKey(key),
    createdAt,
    expiresAt: new Date(createdAt.getTime() + input.validityDays * MS_PER_DAY),
  })

  return { apiKey, key }
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  return apiKeyRepository.findByUserId(userId)
}

export async function deleteApiKey(userId: string, id: string): Promise<void> {
  if (!ObjectId.isValid(id) || !(await apiKeyRepository.deleteByIdForUser(id, userId))) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'API key not found', 404)
  }
}

export async function verifyApiKey(key: string): Promise<AccessTokenPayload> {
  const apiKey = await apiKeyRepository.findByKeyHash(hashKey(key))
  if (!apiKey || apiKey.expiresAt <= new Date()) {
    throw unauthorizedError()
  }

  const user = await userRepository.findById(apiKey.userId)
  if (!user) {
    throw unauthorizedError()
  }

  return { id: user.id, username: user.username }
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function unauthorizedError(): AppError {
  return new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
}

function generateKey(): string {
  return `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('base64url')}`
}

function validate(input: CreateApiKeyInput): string {
  if (!isValidityDays(input?.validityDays)) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'validityDays must be 30, 60, or 90', 400)
  }

  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'description must be a string', 400)
  }

  const description = input.description?.trim() ?? ''

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
      400,
    )
  }

  return description
}

function isValidityDays(value: unknown): value is ValidityDays {
  return VALID_VALIDITY_DAYS.includes(value as ValidityDays)
}
