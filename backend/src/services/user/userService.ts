import bcrypt from 'bcrypt'
import { ErrorCodes } from '@amber-hub/shared'
import { AppError } from '../../errors/AppError'
import * as userRepository from '../../repositories/user/userRepository'
import type { User } from './user.types'

const BCRYPT_COST_FACTOR = 12
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/
const MIN_PASSWORD_LENGTH = 8

export interface RegisterUserInput {
  username: string
  password: string
}

export interface LoginUserInput {
  username: string
  password: string
}

export async function register(input: RegisterUserInput): Promise<User> {
  validate(input)

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST_FACTOR)

  try {
    return await userRepository.create({
      id: '',
      username: input.username,
      passwordHash,
      createdAt: new Date(),
    })
  } catch (error) {
    if (error instanceof userRepository.UserAlreadyExistsError) {
      throw new AppError(ErrorCodes.USERNAME_TAKEN, 'This username is already taken', 409)
    }
    throw error
  }
}

export async function authenticate(input: LoginUserInput): Promise<User> {
  if (!input.username || !input.password) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Username and password are required', 400)
  }

  const user = await userRepository.findByUsernameNormalized(input.username)
  const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false

  if (!user || !passwordMatches) {
    throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid username or password', 401)
  }

  return user
}

function validate(input: RegisterUserInput): void {
  if (!input.username || !input.password) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Username and password are required', 400)
  }

  if (!USERNAME_PATTERN.test(input.username)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Username must be 3-30 characters and contain only letters, numbers, and underscores',
      400,
    )
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      400,
    )
  }
}
