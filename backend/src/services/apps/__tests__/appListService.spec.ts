import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getApp, listApps } from '../appListService'

// App storage has no environment override — it is a fixed, derived location. Tests isolate
// themselves by mocking the config module so each run points at its own temp directory.
const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})


async function writeManifest(appsStoragePath: string, dirName: string, manifest: unknown): Promise<void> {
  const dir = join(appsStoragePath, dirName)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf-8')
}

describe('listApps', () => {
  let appsStoragePath: string

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'apps-list-service-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('returns an empty array when the apps directory has no entries', async () => {
    await expect(listApps()).resolves.toEqual([])
  })

  it('returns one entry per installed app directory with a valid manifest', async () => {
    await writeManifest(appsStoragePath, 'sample-app', {
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
    })

    await expect(listApps()).resolves.toEqual([
      { id: 'sample-app', displayName: 'Sample App', frontend: null, backend: null },
    ])
  })

  it('includes the frontend field when the manifest declares one', async () => {
    await writeManifest(appsStoragePath, 'widget-app', {
      id: 'widget-app',
      displayName: 'Widget App',
      version: '1.0.0',
      frontend: { entry: 'frontend/index.js' },
    })

    await expect(listApps()).resolves.toEqual([
      {
        id: 'widget-app',
        displayName: 'Widget App',
        frontend: { entry: 'frontend/index.js' },
        backend: null,
      },
    ])
  })

  it('includes the backend field when the manifest declares one', async () => {
    await writeManifest(appsStoragePath, 'widget-app', {
      id: 'widget-app',
      displayName: 'Widget App',
      version: '1.0.0',
      backend: { entry: 'backend/index.js' },
    })

    await expect(listApps()).resolves.toEqual([
      {
        id: 'widget-app',
        displayName: 'Widget App',
        frontend: null,
        backend: { entry: 'backend/index.js' },
      },
    ])
  })

  it('reports backend: null for an app with no backend field', async () => {
    await writeManifest(appsStoragePath, 'sample-app', {
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
    })

    await expect(listApps()).resolves.toEqual([
      { id: 'sample-app', displayName: 'Sample App', frontend: null, backend: null },
    ])
  })

  it('skips a directory with no manifest.json and still returns a valid sibling', async () => {
    await mkdir(join(appsStoragePath, '.tmp'), { recursive: true })
    await writeManifest(appsStoragePath, 'sample-app', {
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
    })

    await expect(listApps()).resolves.toEqual([
      { id: 'sample-app', displayName: 'Sample App', frontend: null, backend: null },
    ])
  })

  it('skips a directory whose manifest fails validation and still returns a valid sibling', async () => {
    await writeManifest(appsStoragePath, 'broken-app', { id: 'broken-app' })
    await writeManifest(appsStoragePath, 'sample-app', {
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
    })

    await expect(listApps()).resolves.toEqual([
      { id: 'sample-app', displayName: 'Sample App', frontend: null, backend: null },
    ])
  })

  it('skips a directory whose manifest is not valid JSON', async () => {
    const dir = join(appsStoragePath, 'corrupt-app')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'manifest.json'), 'not json', 'utf-8')

    await expect(listApps()).resolves.toEqual([])
  })
})

describe('getApp', () => {
  let appsStoragePath: string

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'apps-list-service-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('resolves a single app by id, including its backend field', async () => {
    await writeManifest(appsStoragePath, 'sample-app', {
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
      backend: { entry: 'backend/index.js' },
    })

    await expect(getApp('sample-app')).resolves.toEqual({
      id: 'sample-app',
      displayName: 'Sample App',
      frontend: null,
      backend: { entry: 'backend/index.js' },
    })
  })

  it('resolves null for an unknown app id', async () => {
    await expect(getApp('unknown-app')).resolves.toBeNull()
  })
})
