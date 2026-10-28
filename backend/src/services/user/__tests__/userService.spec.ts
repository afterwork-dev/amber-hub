import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import { authenticate, register } from '../userService'

vi.mock('../../../repositories/user/userRepository', async () => {
  const actual = await vi.importActual<typeof import('../../../repositories/user/userRepository')>(
    '../../../repositories/user/userRepository',
  )
  return {
    ...actual,
    create: vi.fn(),
    findByUsernameNormalized: vi.fn(),
  }
})

import * as userRepository from '../../../repositories/user/userRepository'

describe('userService.register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hashes the password and persists the user via the repository', async () => {
    vi.mocked(userRepository.create).mockImplementation(async (user) => ({
      ...user,
      id: 'generated-id',
    }))

    const result = await register({ username: 'alice', password: 'correct-horse' })

    expect(result.id).toBe('generated-id')
    expect(result.username).toBe('alice')
    expect(result.passwordHash).not.toBe('correct-horse')
    expect(await bcrypt.compare('correct-horse', result.passwordHash)).toBe(true)

    expect(userRepository.create).toHaveBeenCalledTimes(1)
    const persistedUser = vi.mocked(userRepository.create).mock.calls[0]?.[0]
    expect(persistedUser?.username).toBe('alice')
    expect(persistedUser?.passwordHash).not.toBe('correct-horse')
  })

  it('maps a UserAlreadyExistsError from the repository to AppError(USERNAME_TAKEN)', async () => {
    vi.mocked(userRepository.create).mockRejectedValue(new userRepository.UserAlreadyExistsError())

    await expect(register({ username: 'alice', password: 'correct-horse' })).rejects.toMatchObject({
      name: 'AppError',
      errorCode: 'USERNAME_TAKEN',
      statusCode: 409,
    })
  })

  it.each([
    ['', 'correct-horse'],
    ['alice', ''],
  ])('rejects a required field left empty (username=%s)', async (username, password) => {
    await expect(register({ username, password })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(userRepository.create).not.toHaveBeenCalled()
  })

  it.each(['ab', 'a'.repeat(31), 'invalid username!'])(
    'rejects a username outside the allowed format/length (%s)',
    async (username) => {
      await expect(register({ username, password: 'correct-horse' })).rejects.toMatchObject({
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      })
      expect(userRepository.create).not.toHaveBeenCalled()
    },
  )

  it('rejects a password shorter than 8 characters', async () => {
    await expect(register({ username: 'alice', password: 'short' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(userRepository.create).not.toHaveBeenCalled()
  })
})

describe('userService.authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the matching user when the password is correct', async () => {
    const passwordHash = await bcrypt.hash('correct-horse', 4)
    vi.mocked(userRepository.findByUsernameNormalized).mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      passwordHash,
      createdAt: new Date(),
    })

    const result = await authenticate({ username: 'alice', password: 'correct-horse' })

    expect(result.id).toBe('user-1')
    expect(result.username).toBe('alice')
  })

  it.each([
    ['', 'correct-horse'],
    ['alice', ''],
  ])('rejects a required field left empty (username=%s)', async (username, password) => {
    await expect(authenticate({ username, password })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(userRepository.findByUsernameNormalized).not.toHaveBeenCalled()
  })

  it('rejects with INVALID_CREDENTIALS when the username does not exist', async () => {
    vi.mocked(userRepository.findByUsernameNormalized).mockResolvedValue(null)

    await expect(authenticate({ username: 'unknown', password: 'correct-horse' })).rejects.toMatchObject(
      { errorCode: 'INVALID_CREDENTIALS', statusCode: 401 },
    )
  })

  it('rejects with the same INVALID_CREDENTIALS error when the password is wrong', async () => {
    const passwordHash = await bcrypt.hash('correct-horse', 4)
    vi.mocked(userRepository.findByUsernameNormalized).mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      passwordHash,
      createdAt: new Date(),
    })

    await expect(authenticate({ username: 'alice', password: 'wrong-password' })).rejects.toMatchObject(
      { errorCode: 'INVALID_CREDENTIALS', statusCode: 401 },
    )
  })
})
