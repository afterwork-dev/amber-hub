import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true, styles: 'none' })],
  test: {
    // The frontend needs a DOM (and a real ShadowRoot); the backend entry and the shared
    // modules both halves import are plain Node.
    environmentMatchGlobs: [
      ['frontend/**', 'jsdom'],
      ['backend/**', 'node'],
      ['shared/**', 'node'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    // Vitest stubs CSS imports to '' by default. The shell injects its stylesheet into the
    // shadow root at mount, so that stub would make the isolation tests vacuous.
    css: true,
    server: {
      deps: {
        // Vuetify ships ESM that Vitest must transform rather than externalize.
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['frontend/**/*.{ts,vue}', 'backend/**/*.ts', 'shared/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
