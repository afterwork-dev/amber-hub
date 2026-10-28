import { isValidPayoutDate } from '../shared/payoutDate'

export class InvalidRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRecordError'
  }
}

export function reject(reason: string): never {
  throw new InvalidRecordError(`invalid investment income record: ${reason}`)
}

export function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') reject(`${field} must be text`)
  const trimmed = value.trim()
  if (trimmed === '') reject(`${field} must not be empty`)
  if (trimmed.length > maxLength) reject(`${field} must be at most ${maxLength} characters`)
  return trimmed
}

export function requireCalendarDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isValidPayoutDate(value)) {
    reject(`${field} must be a past YYYY-MM-DD calendar date`)
  }
  return value
}

export function requireCents(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    reject(`${field} must be a whole number of cents, greater than zero`)
  }
  return value
}

/** Euro amounts arrive from LLM clients as decimals; anything finer than a cent is a mistake. */
export function centsFromEuros(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    reject('amount must be a number of euros')
  }
  const cents = amount * 100
  if (Math.abs(cents - Math.round(cents)) > 1e-6) reject('amount must have at most two decimals')
  return requireCents(Math.round(cents), 'amount')
}

export function requireKnownFieldsOnly(
  body: unknown,
  allowedFields: readonly string[],
): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    reject('body must be an object')
  }

  const source = body as Record<string, unknown>
  const unknownField = Object.keys(source).find((field) => !allowedFields.includes(field))
  if (unknownField) reject(`unknown field ${unknownField}`)

  return source
}
