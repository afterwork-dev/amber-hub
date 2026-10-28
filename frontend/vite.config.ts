import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), vuetify({ autoImport: true })],
    server: {
      port: Number(env.FRONTEND_PORT) || 5173,
      proxy: {
        '/resources': env.VITE_BACKEND_ORIGIN || 'http://localhost:3000',
        '/app-api': env.VITE_BACKEND_ORIGIN || 'http://localhost:3000',
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['e2e/**', 'node_modules/**'],
      server: {
        deps: {
          inline: ['vuetify'],
        },
      },
      coverage: {
        exclude: [
          'node_modules/**',
          'dist/**',
          'e2e/**',
          '**/*.config.*',
          '**/*.d.ts',
          '**/__tests__/**',
          'src/test/**',
          'src/main.ts',
          'src/App.vue',
        ],
      },
    },
  }
})
