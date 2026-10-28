import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { isPathWithin } from '../pathSafety'

describe('isPathWithin', () => {
  const baseDir = join('/tmp', 'app-storage', 'sample-app')

  it('returns true for a path contained within the base directory', () => {
    expect(isPathWithin(baseDir, join(baseDir, 'frontend', 'index.js'))).toBe(true)
  })

  it('returns true for a path that exactly matches the base directory', () => {
    expect(isPathWithin(baseDir, baseDir)).toBe(true)
  })

  it('returns false for a path that escapes the base directory via ..', () => {
    expect(isPathWithin(baseDir, join(baseDir, '..', 'other-app', 'secret.txt'))).toBe(false)
  })
})
