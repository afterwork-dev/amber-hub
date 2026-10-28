import { MAX_NAME_LENGTH, MAX_SERIAL_NO_LENGTH } from '../shared/entry-limits'
import { isKnownEntryCategoryId } from '../shared/entry-categories'
import { isKnownLocationId } from '../shared/locations'
import { isValidPurchaseDate } from '../shared/purchaseDate'
import type { NewEntryInput } from '../shared/types'

const ALLOWED_FIELDS = [
  'name',
  'serialNo',
  'purchaseDate',
  'purchaseValueCents',
  'locationId',
  'categoryId',
]

function reject(reason: string): never {
  throw new Error(`invalid treasury entry: ${reason}`)
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') reject(`${field} must be text`)
  const trimmed = value.trim()
  if (trimmed === '') reject(`${field} must not be empty`)
  if (trimmed.length > maxLength) reject(`${field} must be at most ${maxLength} characters`)
  return trimmed
}

function requirePastDate(value: unknown): string {
  if (typeof value !== 'string' || !isValidPurchaseDate(value)) {
    reject('purchaseDate must be a past YYYY-MM-DD calendar date')
  }
  return value
}

function requireCents(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    reject('purchaseValueCents must be a whole number of cents, zero or more')
  }
  return value
}

/** Anything the app does not accept from a caller — including the server-assigned fields. */
function requireKnownFieldsOnly(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    reject('body must be an object')
  }

  const source = body as Record<string, unknown>
  const unknownField = Object.keys(source).find((field) => !ALLOWED_FIELDS.includes(field))
  if (unknownField) reject(`unknown field ${unknownField}`)

  return source
}

export function validateNewEntry(body: unknown): NewEntryInput {
  const source = requireKnownFieldsOnly(body)

  if (!isKnownEntryCategoryId(String(source.categoryId))) {
    reject('categoryId is not a known entry category')
  }
  if (!isKnownLocationId(String(source.locationId))) {
    reject('locationId is not a known location')
  }

  const entry: NewEntryInput = {
    name: requireText(source.name, 'name', MAX_NAME_LENGTH),
    categoryId: String(source.categoryId),
    locationId: String(source.locationId),
  }

  if (source.serialNo !== undefined) {
    entry.serialNo = requireText(source.serialNo, 'serialNo', MAX_SERIAL_NO_LENGTH)
  }
  if (source.purchaseDate !== undefined) entry.purchaseDate = requirePastDate(source.purchaseDate)
  if (source.purchaseValueCents !== undefined) {
    entry.purchaseValueCents = requireCents(source.purchaseValueCents)
  }

  return entry
}
