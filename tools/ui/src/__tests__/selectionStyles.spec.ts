import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

describe('styles.css selection controls', () => {
  it('has the switch, checkbox and radio rules and the 44px row', () => {
    for (const selector of [
      '.amber-choice',
      '.amber-switch__track',
      '.amber-switch__knob',
      '.amber-checkbox__box',
      '.amber-radio__circle',
      'min-height: 44px',
    ]) {
      expect(css).toContain(selector)
    }
  })
})
