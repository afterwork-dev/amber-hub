import { describe, expect, it } from 'vitest'
import { tokens } from '@amber-hub/ui/tokens'
import { vuetify } from '../vuetify'

describe('vuetify plugin', () => {
  it('defaults to the dark theme', () => {
    expect(vuetify.theme.name.value).toBe('dark')
  })

  it('maps the dark theme colours to AmberUI tokens', () => {
    expect(vuetify.theme.themes.value.dark!.colors).toMatchObject({
      background: tokens.canvas,
      surface: tokens.card,
      primary: tokens['accent-500'],
      'on-primary': tokens['on-accent'],
      error: tokens.error,
      warning: tokens.warning,
      success: tokens.success,
      info: tokens.info,
    })
  })
})
