import { describe, it, expect } from 'vitest'
import { optionalText, requiredText, type Rule } from '../fieldRules'

function firstFailure(rules: Rule[], value: unknown): string | true {
  for (const rule of rules) {
    const result = rule(value)
    if (result !== true) return result
  }
  return true
}

describe('requiredText', () => {
  const rules = requiredText('name', 200)

  it('accepts a non-empty value within the limit', () => {
    expect(firstFailure(rules, 'Krugerrand')).toBe(true)
  })

  it('trims before measuring, so surrounding spaces do not count', () => {
    expect(firstFailure(rules, `  ${'x'.repeat(200)}  `)).toBe(true)
  })

  it('rejects an empty value with the required message', () => {
    expect(firstFailure(rules, '')).toBe('A name is required.')
  })

  it('rejects a whitespace-only value as missing', () => {
    expect(firstFailure(rules, '   ')).toBe('A name is required.')
  })

  it('rejects a nullish value as missing', () => {
    expect(firstFailure(rules, null)).toBe('A name is required.')
    expect(firstFailure(rules, undefined)).toBe('A name is required.')
  })

  it('rejects a value past the limit with the length message', () => {
    expect(firstFailure(rules, 'x'.repeat(201))).toBe('Keep the name to 200 characters or fewer.')
  })

  it('names the field and limit it was built with', () => {
    expect(firstFailure(requiredText('booking name', 12), 'x'.repeat(13))).toBe(
      'Keep the booking name to 12 characters or fewer.',
    )
  })
})

describe('optionalText', () => {
  const rules = optionalText('booking name', 200)

  it('accepts an absent value', () => {
    expect(firstFailure(rules, '')).toBe(true)
    expect(firstFailure(rules, null)).toBe(true)
    expect(firstFailure(rules, undefined)).toBe(true)
  })

  it('accepts a value within the limit', () => {
    expect(firstFailure(rules, 'VANG FTSE AW DIST')).toBe(true)
  })

  it('rejects a value past the limit with the length message', () => {
    expect(firstFailure(rules, 'x'.repeat(201))).toBe(
      'Keep the booking name to 200 characters or fewer.',
    )
  })
})
