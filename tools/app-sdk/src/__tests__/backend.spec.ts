import { describe, expect, it } from 'vitest'
import { isAppStorageError } from '../backend'

/** Builds the error exactly as the Hub's app-backend runner constructs it. */
function appStorageError(errorCode: string, errorMessage = 'something went wrong'): Error {
  const error = new Error(errorMessage)
  error.name = 'AppStorageError'
  return Object.assign(error, { errorCode, errorMessage })
}

describe('isAppStorageError', () => {
  it('recognises a storage error thrown by the SDK', () => {
    expect(isAppStorageError(appStorageError('APP_STORAGE_RECORD_NOT_FOUND'))).toBe(true)
  })

  it.each([
    'APP_STORAGE_INVALID_COLLECTION_NAME',
    'APP_STORAGE_INVALID_RECORD',
    'APP_STORAGE_INVALID_FILTER',
    'APP_STORAGE_RECORD_NOT_FOUND',
    'APP_STORAGE_UNAVAILABLE',
  ])('recognises the documented code %s', (errorCode) => {
    expect(isAppStorageError(appStorageError(errorCode))).toBe(true)
  })

  it('stays true for a code this SDK version does not know yet', () => {
    // Forward compatibility: a newer Hub must not make older apps mis-handle storage errors.
    expect(isAppStorageError(appStorageError('APP_STORAGE_SOMETHING_NEW'))).toBe(true)
  })

  it('narrows the type so errorCode is reachable without a cast', () => {
    const error: unknown = appStorageError('APP_STORAGE_UNAVAILABLE')

    if (!isAppStorageError(error)) {
      throw new Error('expected the guard to narrow')
    }
    expect(error.errorCode).toBe('APP_STORAGE_UNAVAILABLE')
    expect(error.errorMessage).toBe('something went wrong')
  })

  it.each([
    ['a plain Error', new Error('boom')],
    ['an error with a different name', Object.assign(new Error('boom'), { name: 'TypeError' })],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'APP_STORAGE_UNAVAILABLE'],
    ['a number', 42],
    ['an empty object', {}],
  ])('returns false for %s', (_label, candidate) => {
    expect(isAppStorageError(candidate)).toBe(false)
  })

  it('returns false for a look-alike that is missing errorCode', () => {
    const lookAlike = new Error('boom')
    lookAlike.name = 'AppStorageError'

    expect(isAppStorageError(lookAlike)).toBe(false)
  })

  it('returns false for a look-alike whose errorCode is not a string', () => {
    expect(isAppStorageError(appStorageError(404 as unknown as string))).toBe(false)
  })

  it('returns false for a plain object that merely looks like the error', () => {
    expect(
      isAppStorageError({
        name: 'AppStorageError',
        errorCode: 'APP_STORAGE_UNAVAILABLE',
        errorMessage: 'boom',
      }),
    ).toBe(false)
  })
})
