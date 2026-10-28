import { describe, it, expect } from 'vitest'
import { totalsOf } from '../totals'

describe('totalsOf', () => {
  it('splits values into assets and liabilities', () => {
    expect(totalsOf([1000, 500, -300, 0])).toEqual({
      assetsCents: 1500,
      liabilitiesCents: -300,
      networthCents: 1200,
    })
  })

  it('is all zero without values', () => {
    expect(totalsOf([])).toEqual({ assetsCents: 0, liabilitiesCents: 0, networthCents: 0 })
  })
})
