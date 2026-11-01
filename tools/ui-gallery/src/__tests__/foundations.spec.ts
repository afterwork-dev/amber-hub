import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { tokens } from '@amber-hub/ui/tokens'
import { colour, foundations, gridMargin, typography } from '../foundations'

const doc = readFileSync(new URL('../../../../docs/amberui.md', import.meta.url), 'utf8')

function normalise(text: string): string {
  return text
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/ \[(measured|derived)\]/g, '')
    .replace(/\s+/g, ' ')
}

// Every plain object nested anywhere in a page's data.
function objects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(objects)
  if (value === null || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  return [object, ...Object.values(object).flatMap(objects)]
}

const pageObjects = Object.entries(foundations).map(
  ([page, data]) => [page, objects(data)] as const,
)
const allObjects = pageObjects.flatMap(([, list]) => list)
const tokenItems = allObjects.filter((object) => typeof object.token === 'string')

describe('foundations', () => {
  it('shows every token on exactly one page, and nothing that is not a token', () => {
    const pagesByToken = new Map<string, Set<string>>()
    for (const [page, list] of pageObjects) {
      for (const object of list) {
        if (typeof object.token !== 'string') continue
        const set = pagesByToken.get(object.token) ?? new Set()
        set.add(page)
        pagesByToken.set(object.token, set)
      }
    }
    expect([...pagesByToken.keys()].sort()).toEqual(Object.keys(tokens).sort())
    for (const [token, set] of pagesByToken) {
      expect(set.size, token).toBe(1)
    }
  })

  it('displays each token with its value from tokens', () => {
    for (const object of tokenItems) {
      expect(object.value, String(object.token)).toBe(tokens[object.token as keyof typeof tokens])
    }
  })

  it('groups the colours Gray 8, Accent 5, Tint 1, Status 4, in doc order', () => {
    expect(colour.groups.map((group) => [group.title, group.items.map((i) => i.token)])).toEqual([
      [
        'Gray',
        [
          'canvas',
          'base',
          'card',
          'raised',
          'border',
          'text-muted',
          'text-secondary',
          'text-primary',
        ],
      ],
      ['Accent', ['accent-600', 'accent-500', 'accent-400', 'accent-300', 'on-accent']],
      ['Tint', ['accent-tint']],
      ['Status', ['success', 'warning', 'error', 'info']],
    ])
  })

  it('copies every usage string and page note from the doc', () => {
    const normalisedDoc = normalise(doc)
    const texts = allObjects.flatMap((object) => [
      ...(typeof object.usage === 'string' ? [object.usage] : []),
      ...(Array.isArray(object.notes) ? (object.notes as string[]) : []),
    ])
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) {
      expect(normalisedDoc).toContain(normalise(text))
    }
    for (const data of Object.values(foundations)) {
      expect(data.notes.length).toBeGreaterThan(0)
    }
  })

  it('flags as derived exactly what the doc marks [derived], including the overline letter-spacing', () => {
    const foundationsDoc = doc.slice(0, doc.indexOf('## 4. Components'))
    const markers = foundationsDoc.match(/\[derived\]/g) ?? []
    const derived = allObjects.filter((object) => object.derived === true)
    expect(derived).toHaveLength(markers.length)
    const overline = typography.styles.find((style) => style.name === 'overline')!
    expect(overline.specs.find((s) => s.label === 'letter-spacing')?.derived).toBe(true)
  })

  it('picks the grid margin by frame width', () => {
    expect(gridMargin(390)).toBe(16)
    expect(gridMargin(834)).toBe(32)
    expect(gridMargin(1440)).toBe(80)
    expect(gridMargin(767)).toBe(16)
    expect(gridMargin(768)).toBe(32)
    expect(gridMargin(1279)).toBe(32)
    expect(gridMargin(1280)).toBe(80)
  })
})
