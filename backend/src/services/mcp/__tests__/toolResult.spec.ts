import { describe, it, expect } from 'vitest'
import { errorResult, renderToolResult } from '../toolResult'

const CAP = 200000

describe('renderToolResult', () => {
  it('returns a string verbatim with no structuredContent', () => {
    const result = renderToolResult('hello', CAP)
    expect(result.content).toEqual([{ type: 'text', text: 'hello' }])
    expect(result.structuredContent).toBeUndefined()
    expect(result.isError).toBeUndefined()
  })

  it('pretty-prints an object and attaches it as structuredContent', () => {
    const result = renderToolResult({ a: 1 }, CAP)
    expect(result.content[0]).toEqual({ type: 'text', text: JSON.stringify({ a: 1 }, null, 2) })
    expect(result.structuredContent).toEqual({ a: 1 })
  })

  it('renders scalars and arrays as JSON text without structuredContent', () => {
    for (const value of [42, true, null, [1, 2, 3]]) {
      const result = renderToolResult(value, CAP)
      expect(result.content[0]).toEqual({ type: 'text', text: JSON.stringify(value, null, 2) })
      expect(result.structuredContent).toBeUndefined()
    }
  })

  it('rejects a result larger than the cap as an isError result, never truncated', () => {
    const result = renderToolResult('x'.repeat(11), 10)
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    expect(result.content[0]).toMatchObject({ type: 'text' })
    expect(JSON.stringify(result.content[0])).toContain('too large')
  })

  it('accepts a result exactly at the cap', () => {
    const result = renderToolResult('x'.repeat(10), 10)
    expect(result.isError).toBeUndefined()
  })
})

describe('errorResult', () => {
  it('carries only the given text and isError true', () => {
    expect(errorResult('boom')).toEqual({
      content: [{ type: 'text', text: 'boom' }],
      isError: true,
    })
  })
})
