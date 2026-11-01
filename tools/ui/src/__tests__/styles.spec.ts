import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('styles.css', () => {
  it('starts every class selector with amber-', () => {
    const classes = [...withoutComments.matchAll(/\.(?![0-9])([\w-]+)/g)].map((match) => match[1])
    expect(classes.length).toBeGreaterThan(0)
    expect(classes.filter((name) => !name?.startsWith('amber-'))).toEqual([])
  })

  it('has no raw colour values', () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/)
  })

  it('has the button, icon button and spinner rules and a reduced-motion block', () => {
    expect(css).toContain('.amber-button')
    expect(css).toContain('.amber-icon-button')
    expect(css).toContain('.amber-button__spinner')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
