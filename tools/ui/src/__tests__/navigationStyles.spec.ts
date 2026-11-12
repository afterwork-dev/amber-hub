import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const marker = '@media (prefers-reduced-motion: reduce)'

describe('styles.css navigation', () => {
  it('has the navigation rules before the reduced-motion block', () => {
    for (const selector of [
      '.amber-top-bar {',
      '.amber-nav-drawer {',
      '.amber-nav-section {',
      '.amber-nav-item {',
      '.amber-nav-item--active {',
      '.amber-account-switcher {',
      '.amber-app-shell {',
      '.amber-app-shell--phone {',
      '.amber-app-shell--tablet {',
      '.amber-app-shell--desktop {',
      '.amber-app-shell--narrow',
      '.amber-app-shell__content {',
      '.amber-app-shell__overlay {',
      '.amber-app-shell__scrim {',
    ]) {
      expect(css, selector).toContain(selector)
      expect(css.indexOf(selector), selector).toBeLessThan(css.lastIndexOf(marker))
    }
  })

  it('shares the scrim declaration with the dialog backdrop', () => {
    expect(css).toContain(
      '.amber-app-shell__scrim,\n.amber-dialog::backdrop {\n  background: rgba(0, 0, 0, 0.6);\n}',
    )
    expect(css.match(/rgba?\(/g)).toHaveLength(1)
  })

  it('keeps one reduced-motion block', () => {
    expect(css.split(marker)).toHaveLength(2)
  })
})
