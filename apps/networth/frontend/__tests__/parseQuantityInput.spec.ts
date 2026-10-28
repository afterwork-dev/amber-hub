import { describe, it, expect } from 'vitest'
import { parseQuantityInput } from '../parseQuantityInput'

describe('parseQuantityInput', () => {
  it('reads whole and decimal quantities, with comma or dot', () => {
    expect(parseQuantityInput('3')).toBe(3)
    expect(parseQuantityInput(' 2,5 ')).toBe(2.5)
    expect(parseQuantityInput('0.25')).toBe(0.25)
  })

  it('rejects anything that is not a plain number', () => {
    expect(parseQuantityInput('')).toBeNull()
    expect(parseQuantityInput('-1')).toBeNull()
    expect(parseQuantityInput('1.000,5')).toBeNull()
    expect(parseQuantityInput('3x')).toBeNull()
  })
})
