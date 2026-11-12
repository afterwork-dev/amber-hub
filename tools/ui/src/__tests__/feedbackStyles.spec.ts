import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const reducedMotion = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))

describe('styles.css card and feedback components', () => {
  it('has the card, badge, status message, spinner, empty state and skeleton rules', () => {
    for (const selector of [
      '.amber-card',
      '.amber-card--panel',
      '.amber-badge',
      '.amber-status-message',
      '.amber-spinner',
      '.amber-spinner--pending',
      '.amber-empty-state',
      '.amber-skeleton',
      '.amber-skeleton__line',
      '.amber-skeleton__block',
      '.amber-skeleton__circle',
      '@keyframes amber-pulse',
      'max-width: 400px',
    ]) {
      expect(css).toContain(selector)
    }
  })

  it('slows the spinner and stops the skeleton shapes under reduced motion', () => {
    expect(reducedMotion).toContain('.amber-spinner')
    expect(reducedMotion).toContain('1.6s')
    expect(reducedMotion).toContain('.amber-skeleton__line')
    expect(reducedMotion).toContain('animation: none')
  })
})
