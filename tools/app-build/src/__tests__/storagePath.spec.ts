import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { APPS_ROOT, resolveStoragePath } from '../storagePath'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('storagePath', () => {
  it('is the backend package apps-data directory, with no environment override', () => {
    process.env.APPS_STORAGE_PATH = '/should/be/ignored'
    expect(resolveStoragePath()).toBe(join(REPO_ROOT, 'backend', 'apps-data'))
    delete process.env.APPS_STORAGE_PATH
  })

  it('points APPS_ROOT at the repo-root apps directory', () => {
    expect(APPS_ROOT).toBe(join(REPO_ROOT, 'apps'))
  })

  it('resolves to the same fixed location the Hub itself uses', async () => {
    const hubEnv = await readFile(join(REPO_ROOT, 'backend/src/config/env.ts'), 'utf-8')
    const declaration = hubEnv.match(/export function getAppsStoragePath[\s\S]*?\n}/)?.[0] ?? ''

    // Both sides anchor to the backend package, never to process.cwd() and never to an
    // environment variable — otherwise the build writes where the Hub does not look.
    expect(declaration).toContain("resolve(BACKEND_ROOT, 'apps-data')")
    expect(declaration).not.toContain('process.env')
    expect(hubEnv).toMatch(/const BACKEND_ROOT = resolve\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.'\)/)
  })
})
