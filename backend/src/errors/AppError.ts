import type { ErrorCode } from '@amber-hub/shared'

export class AppError extends Error {
  readonly errorCode: ErrorCode
  readonly statusCode: number
  readonly details?: string[]

  constructor(errorCode: ErrorCode, message: string, statusCode = 500, details?: string[]) {
    super(message)
    this.name = 'AppError'
    this.errorCode = errorCode
    this.statusCode = statusCode
    this.details = details
  }
}
