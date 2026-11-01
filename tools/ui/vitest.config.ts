import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    // The component specs mount into jsdom. The specs that read files stay in node, because
    // jsdom's URL class is not accepted by readFileSync.
    environmentMatchGlobs: [['src/__tests__/Amber*.spec.ts', 'jsdom']],
  },
})
