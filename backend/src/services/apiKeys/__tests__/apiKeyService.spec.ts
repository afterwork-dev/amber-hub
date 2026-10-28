import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../../errors/AppError'
import * as apiKeyRepository from '../../../repositories/apiKey/apiKeyRepository'
import * as userRepository from '../../../repositories/user/userRepository'
import {
  createApiKey,
  deleteApiKey,
  hashKey,
  listApiKeys,
  verifyApiKey,
  type CreateApiKeyInput,
} from '../apiKeyService'
import type { ApiKey } from '../apiKey.types'
import type { User } from '../../user/user.types'

vi.mock('../../../repositories/apiKey/apiKeyRepository', () => ({
  create: vi.fn(),
  findByKeyHash: vi.fn(),
  findByUserId: vi.fn(),
  deleteByIdForUser: vi.fn(),
}))
vi.mock('../../../repositories/user/userRepository', () => ({ findById: vi.fn() }))

const USER_ID = '507f1f77bcf86cd799439011'
const NOW = new Date('2026-08-31T10:00:00.000Z')

const create = vi.mocked(apiKeyRepository.create)
const findByKeyHash = vi.mocked(apiKeyRepository.findByKeyHash)
const findByUserId = vi.mocked(apiKeyRepository.findByUserId)
const deleteByIdForUser = vi.mocked(apiKeyRepository.deleteByIdForUser)
const findById = vi.mocked(userRepository.findById)

const VALID_ID = '507f1f77bcf86cd799439012'

function storedKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 'key-id',
    userId: USER_ID,
    description: '',
    keyHash: hashKey('ahk_present'),
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  }
}

function owner(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    username: 'service-user',
    passwordHash: 'hash',
    createdAt: NOW,
    ...overrides,
  }
}

function lastPersisted(): ApiKey {
  const lastCall = create.mock.calls.at(-1)
  if (!lastCall) throw new Error('the repository was never called')
  return lastCall[0]
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  create.mockImplementation(async (apiKey) => ({ ...apiKey, id: 'generated-id' }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('createApiKey validation', () => {
  it.each([45, 0, -30, 29, 91, '30', null, undefined, Number.NaN])(
    'rejects validityDays %p',
    async (validityDays) => {
      const input = { validityDays } as unknown as CreateApiKeyInput

      await expect(createApiKey(USER_ID, input)).rejects.toThrow(AppError)
      expect(create).not.toHaveBeenCalled()
    },
  )

  it('rejects a missing input object', async () => {
    await expect(createApiKey(USER_ID, undefined as unknown as CreateApiKeyInput)).rejects.toThrow(
      AppError,
    )
  })

  it('reports a 400 VALIDATION_ERROR for an invalid validity', async () => {
    const error = await createApiKey(USER_ID, {
      validityDays: 45,
    } as unknown as CreateApiKeyInput).catch((thrown: AppError) => thrown)

    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).errorCode).toBe('VALIDATION_ERROR')
    expect((error as AppError).statusCode).toBe(400)
  })

  it('rejects a description longer than 200 characters', async () => {
    const input: CreateApiKeyInput = { description: 'x'.repeat(201), validityDays: 30 }

    await expect(createApiKey(USER_ID, input)).rejects.toThrow(AppError)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects a non-string description', async () => {
    const input = { description: 42, validityDays: 30 } as unknown as CreateApiKeyInput

    await expect(createApiKey(USER_ID, input)).rejects.toThrow(AppError)
  })

  it('accepts a description of exactly 200 characters', async () => {
    await createApiKey(USER_ID, { description: 'x'.repeat(200), validityDays: 30 })

    expect(lastPersisted().description).toHaveLength(200)
  })

  it('stores an omitted description as an empty string', async () => {
    await createApiKey(USER_ID, { validityDays: 30 })

    expect(lastPersisted().description).toBe('')
  })

  it('trims the description before storing it', async () => {
    await createApiKey(USER_ID, { description: '  CI pipeline  ', validityDays: 30 })

    expect(lastPersisted().description).toBe('CI pipeline')
  })
})

describe('createApiKey key generation', () => {
  it('returns a key with the ahk_ prefix and 43 base64url characters', async () => {
    const { key } = await createApiKey(USER_ID, { validityDays: 30 })

    expect(key).toMatch(/^ahk_[A-Za-z0-9_-]{43}$/)
  })

  it('generates a distinct key on every call', async () => {
    const first = await createApiKey(USER_ID, { validityDays: 30 })
    const second = await createApiKey(USER_ID, { validityDays: 30 })

    expect(first.key).not.toBe(second.key)
  })
})

describe('createApiKey persistence', () => {
  it.each([
    [30, '2026-09-30T10:00:00.000Z'],
    [60, '2026-10-30T10:00:00.000Z'],
    [90, '2026-11-29T10:00:00.000Z'],
  ] as const)('sets expiresAt %i days after creation', async (validityDays, expected) => {
    await createApiKey(USER_ID, { validityDays })

    const persisted = lastPersisted()
    expect(persisted.createdAt).toEqual(NOW)
    expect(persisted.expiresAt.toISOString()).toBe(expected)
  })

  it('persists the key for the requesting user', async () => {
    await createApiKey(USER_ID, { validityDays: 30 })

    expect(lastPersisted().userId).toBe(USER_ID)
  })

  it('persists the sha256 hex digest of the returned key and never the plaintext', async () => {
    const { key } = await createApiKey(USER_ID, { validityDays: 30 })

    const persisted = lastPersisted()
    expect(persisted.keyHash).toBe(createHash('sha256').update(key).digest('hex'))
    expect(persisted.keyHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(persisted)).not.toContain(key)
  })

  it('returns the stored api key alongside the plaintext key', async () => {
    const { apiKey, key } = await createApiKey(USER_ID, { validityDays: 60 })

    expect(apiKey.id).toBe('generated-id')
    expect(key).toMatch(/^ahk_/)
  })
})

describe('listApiKeys', () => {
  it('returns the requesting user’s keys from the repository, untouched', async () => {
    const keys = [storedKey({ id: 'k1' }), storedKey({ id: 'k2' })]
    findByUserId.mockResolvedValue(keys)

    const result = await listApiKeys(USER_ID)

    expect(findByUserId).toHaveBeenCalledWith(USER_ID)
    expect(result).toBe(keys)
  })
})

describe('deleteApiKey', () => {
  async function expectNotFound(promise: Promise<unknown>): Promise<void> {
    const error = await promise.catch((thrown: unknown) => thrown)
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).errorCode).toBe('NOT_FOUND')
    expect((error as AppError).statusCode).toBe(404)
  }

  it('deletes the key for the requesting user', async () => {
    deleteByIdForUser.mockResolvedValue(true)

    await expect(deleteApiKey(USER_ID, VALID_ID)).resolves.toBeUndefined()
    expect(deleteByIdForUser).toHaveBeenCalledWith(VALID_ID, USER_ID)
  })

  it('throws 404 NOT_FOUND when no document was deleted', async () => {
    deleteByIdForUser.mockResolvedValue(false)

    await expectNotFound(deleteApiKey(USER_ID, VALID_ID))
  })

  it('throws 404 NOT_FOUND for a malformed id without touching the repository', async () => {
    await expectNotFound(deleteApiKey(USER_ID, 'not-an-id'))
    expect(deleteByIdForUser).not.toHaveBeenCalled()
  })
})

describe('verifyApiKey', () => {
  it('resolves a valid unexpired key to its owner', async () => {
    findByKeyHash.mockResolvedValue(storedKey())
    findById.mockResolvedValue(owner())

    const result = await verifyApiKey('ahk_present')

    expect(findByKeyHash).toHaveBeenCalledWith(hashKey('ahk_present'))
    expect(findById).toHaveBeenCalledWith(USER_ID)
    expect(result).toEqual({ id: USER_ID, username: 'service-user' })
  })

  async function expectUnauthorized(promise: Promise<unknown>): Promise<void> {
    const error = await promise.catch((thrown: unknown) => thrown)
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).errorCode).toBe('UNAUTHORIZED')
    expect((error as AppError).statusCode).toBe(401)
    expect((error as AppError).message).toBe('Authentication required')
  }

  it('rejects an expired key without loading the owner', async () => {
    findByKeyHash.mockResolvedValue(
      storedKey({ expiresAt: new Date(NOW.getTime() - 1000) }),
    )

    await expectUnauthorized(verifyApiKey('ahk_present'))
    expect(findById).not.toHaveBeenCalled()
  })

  it('rejects a key exactly at its expiry moment', async () => {
    findByKeyHash.mockResolvedValue(storedKey({ expiresAt: NOW }))

    await expectUnauthorized(verifyApiKey('ahk_present'))
  })

  it('rejects a key that was never issued', async () => {
    findByKeyHash.mockResolvedValue(null)

    await expectUnauthorized(verifyApiKey('ahk_unknown'))
    expect(findById).not.toHaveBeenCalled()
  })

  it('rejects a malformed or empty key value', async () => {
    findByKeyHash.mockResolvedValue(null)

    await expectUnauthorized(verifyApiKey(''))
    expect(findByKeyHash).toHaveBeenCalledWith(hashKey(''))
  })

  it('rejects a valid key whose owner no longer exists', async () => {
    findByKeyHash.mockResolvedValue(storedKey())
    findById.mockResolvedValue(null)

    await expectUnauthorized(verifyApiKey('ahk_present'))
  })
})

describe('hashKey', () => {
  it('returns the sha256 hex digest of the key', () => {
    const digest = hashKey('ahk_example')

    expect(digest).toBe(createHash('sha256').update('ahk_example').digest('hex'))
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same key and different for another', () => {
    expect(hashKey('ahk_a')).toBe(hashKey('ahk_a'))
    expect(hashKey('ahk_a')).not.toBe(hashKey('ahk_b'))
  })
})
