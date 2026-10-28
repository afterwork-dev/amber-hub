import { isCategory, type Category } from '../shared/categories'
import { isValidMonth } from '../shared/entryMonth'
import { isValidAmountCents, isValidQuantity } from '../shared/entryValue'

export class InvalidRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRecordError'
  }
}

export function reject(reason: string): never {
  throw new InvalidRecordError(`invalid networth record: ${reason}`)
}

export function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') reject(`${field} must be text`)
  const trimmed = value.trim()
  if (trimmed === '') reject(`${field} must not be empty`)
  if (trimmed.length > maxLength) reject(`${field} must be at most ${maxLength} characters`)
  return trimmed
}

export function requireMonth(value: unknown): string {
  if (typeof value !== 'string' || !isValidMonth(value)) {
    reject('month must be a YYYY-MM month that is not in the future')
  }
  return value
}

export function requireCategory(value: unknown): Category {
  if (!isCategory(value)) reject('category must be one of the fixed categories')
  return value
}

export function requireAmountCents(value: unknown): number {
  if (typeof value !== 'number' || !isValidAmountCents(value)) {
    reject('amountCents must be a whole number of cents within the limit')
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
  return requireAmountCents(Math.round(cents))
}

export function requireQuantity(value: unknown): number {
  if (typeof value !== 'number' || !isValidQuantity(value)) {
    reject('quantity must be greater than zero with at most four decimals')
  }
  return value
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
