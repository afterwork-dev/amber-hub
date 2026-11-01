import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { tokens } from '../tokens'

const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')

function parseDeclarations(block: string): Record<string, string> {
  const declarations: Record<string, string> = {}
  for (const match of block.matchAll(/--amber-([a-z0-9-]+):\s*([^;]+);/g)) {
    declarations[match[1]!] = match[2]!.trim()
  }
  return declarations
}

const rootRule = /:root,\s*:host\s*\{([^}]*)\}/
const mediaBlock = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?\})\s*\}/

describe('tokens.css', () => {
  const rootBlock = css.replace(mediaBlock, '').match(rootRule)![1]!

  it('declares exactly the tokens exported by tokens.ts, with the same values', () => {
    expect(parseDeclarations(rootBlock)).toEqual(tokens)
  })

  it('has 56 tokens, spot-checked against the design doc', () => {
    expect(Object.keys(tokens)).toHaveLength(56)
    expect(tokens['on-accent']).toBe('#111111')
    expect(tokens.info).toBe('#C6C6C6')
  })

  it('zeroes the durations under prefers-reduced-motion', () => {
    const media = css.match(mediaBlock)
    expect(media).not.toBeNull()
    const reduced = media![1]!.match(rootRule)![1]!
    expect(parseDeclarations(reduced)).toEqual({
      'duration-fast': '0ms',
      'duration-normal': '0ms',
    })
  })
})
