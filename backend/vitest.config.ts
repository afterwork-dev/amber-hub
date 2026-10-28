import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['node_modules/**', 'dist/**', '**/*.config.*', '**/__tests__/**', 'src/index.ts'],
    },
  },
})
