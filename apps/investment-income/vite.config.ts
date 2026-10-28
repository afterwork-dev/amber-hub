import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// One build per declared entry. A single multi-entry build hoists modules both entries import
// (shared/) into a chunk at the app root, which the Hub never serves — it exposes
// /resources/{appId}/frontend/* only. Building separately keeps each entry self-contained, which
// is what app storage requires: no node_modules, nothing to resolve beyond the entry itself.
const entry = process.env.APP_ENTRY === 'backend' ? 'backend' : 'frontend'

const entries = {
  frontend: { 'frontend/index': 'frontend/entry.ts' },
  backend: { 'backend/index': 'backend/index.ts' },
}

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true, styles: 'none' })],
  define: {
    // Required. Vue's distributed build reads process.env.NODE_ENV at runtime and expects the
    // bundler to substitute it. Vite does this for its app-build mode but NOT for library mode —
    // without this the bundle throws `process is not defined` the instant the Hub loads it.
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: { entry: entries[entry], formats: ['es'] },
    outDir: 'dist',
    // The frontend build runs first and clears dist; the backend build adds to it.
    emptyOutDir: entry === 'frontend',
  },
})
