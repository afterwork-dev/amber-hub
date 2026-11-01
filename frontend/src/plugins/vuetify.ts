import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { tokens } from '@amber-hub/ui/tokens'

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: tokens.canvas,
          surface: tokens.card,
          primary: tokens['accent-500'],
          'on-primary': tokens['on-accent'],
          error: tokens.error,
          warning: tokens.warning,
          success: tokens.success,
          info: tokens.info,
        },
      },
    },
  },
})
