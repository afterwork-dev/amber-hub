import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('styles.css dialog', () => {
  it('has the dialog rules', () => {
    for (const selector of [
      '.amber-dialog {',
      '.amber-dialog::backdrop',
      'rgba(0, 0, 0, 0.6)',
      '.amber-dialog__panel',
      '.amber-dialog__title',
      '.amber-dialog__body',
      '.amber-dialog__actions',
      'min(480px, calc(100% - 32px))',
      'var(--amber-elevation-3)',
      'var(--amber-radius-xl)',
      'var(--amber-duration-normal)',
      '@keyframes amber-dialog-in',
    ]) {
      expect(css).toContain(selector)
    }
  })

  it('keeps one reduced-motion block, at the end', () => {
    const marker = '@media (prefers-reduced-motion: reduce)'
    expect(css.split(marker)).toHaveLength(2)
    expect(css.lastIndexOf('.amber-dialog')).toBeLessThan(css.lastIndexOf(marker))
  })
})
