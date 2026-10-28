import { describe, it, expect } from 'vitest'
import { CATEGORIES, isCategory } from '../categories'

describe('isCategory', () => {
  it('accepts every fixed category', () => {
    for (const category of CATEGORIES) expect(isCategory(category.value)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isCategory('crypto')).toBe(false)
    expect(isCategory('Cash')).toBe(false)
    expect(isCategory(undefined)).toBe(false)
  })
})
