import { describe, expect, it } from 'vitest'
import { Search, icons } from '../icons'

describe('icons', () => {
  it('re-exports the Lucide icons namespace', () => {
    expect(Object.keys(icons).length).toBeGreaterThan(1000)
  })

  it('re-exports each icon component, the same object as in the namespace', () => {
    expect(Search).toBeDefined()
    expect(Search).toBe(icons.Search)
  })
})
