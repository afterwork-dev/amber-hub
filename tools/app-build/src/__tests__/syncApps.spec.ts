import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppSyncError, syncApps } from '../syncApps'
import type { AppManifest } from '../manifestValidator'

let root: string
let appsRoot: string
let storagePath: string

interface AppFixture {
  manifest?: Partial<AppManifest> | string
  files?: Record<string, string>
  withPackageJson?: boolean
  withDist?: boolean
}

async function writeFileAt(path: string, contents: string): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, contents, 'utf-8')
}

async function createAppFixture(dirName: string, fixture: AppFixture = {}): Promise<string> {
  const {
    manifest = { id: dirName, displayName: 'Fixture App', version: '1.0.0' },
    files = {},
    withPackageJson = true,
    withDist = true,
  } = fixture
  const appDir = join(appsRoot, dirName)
  await mkdir(appDir, { recursive: true })

  if (withPackageJson) {
    await writeFileAt(join(appDir, 'package.json'), JSON.stringify({ name: dirName }))
  }

  if (withDist) {
    const distDir = join(appDir, 'dist')
    await mkdir(distDir, { recursive: true })
    const raw = typeof manifest === 'string' ? manifest : JSON.stringify(manifest)
    await writeFileAt(join(distDir, 'manifest.json'), raw)
    for (const [relativePath, contents] of Object.entries(files)) {
      await writeFileAt(join(distDir, relativePath), contents)
    }
  }

  return appDir
}

async function storageEntries(): Promise<string[]> {
  const entries = await readdir(storagePath, { withFileTypes: true })
  return entries.map((entry) => entry.name).sort()
}

async function run(): Promise<{ id: string }[]> {
  return syncApps({ appsRoot, storagePath })
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'sync-apps-'))
  appsRoot = join(root, 'apps')
  storagePath = join(root, 'apps-data')
  await mkdir(appsRoot, { recursive: true })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('syncApps', () => {
  it('copies a valid app package into storage', async () => {
    await createAppFixture('echo-app', {
      manifest: {
        id: 'echo-app',
        displayName: 'Echo App',
        version: '1.0.0',
        frontend: { entry: 'frontend/index.js' },
      },
      files: { 'frontend/index.js': 'export function mount() {}' },
    })

    const synced = await run()

    expect(synced).toEqual([{ id: 'echo-app', distDir: join(appsRoot, 'echo-app', 'dist') }])
    expect(await storageEntries()).toEqual(['echo-app'])
    expect(await readFile(join(storagePath, 'echo-app', 'frontend/index.js'), 'utf-8')).toBe(
      'export function mount() {}',
    )
  })

  it('reconciles storage to exactly the built app set, removing stale directories', async () => {
    await mkdir(join(storagePath, 'removed-app'), { recursive: true })
    await writeFileAt(join(storagePath, 'removed-app', 'manifest.json'), '{}')
    await mkdir(join(storagePath, '.tmp'), { recursive: true })
    await createAppFixture('kept-app', {
      manifest: { id: 'kept-app', displayName: 'Kept App', version: '1.0.0' },
    })

    await run()

    expect(await storageEntries()).toEqual(['kept-app'])
  })

  it('replaces an app already present in storage rather than merging into it', async () => {
    await mkdir(join(storagePath, 'echo-app'), { recursive: true })
    await writeFileAt(join(storagePath, 'echo-app', 'stale.js'), 'old')
    await createAppFixture('echo-app', {
      manifest: { id: 'echo-app', displayName: 'Echo App', version: '1.0.0' },
    })

    await run()

    expect(await readdir(join(storagePath, 'echo-app'))).toEqual(['manifest.json'])
  })

  it('ignores directories that are not workspaces', async () => {
    await createAppFixture('not-a-workspace', { withPackageJson: false })

    const synced = await run()

    expect(synced).toEqual([])
    expect(await storageEntries()).toEqual([])
  })

  it('creates an empty storage directory when there are no apps', async () => {
    const synced = await run()

    expect(synced).toEqual([])
    expect(await storageEntries()).toEqual([])
  })

  it('succeeds when the apps root does not exist at all', async () => {
    await rm(appsRoot, { recursive: true, force: true })

    await expect(run()).resolves.toEqual([])
    expect(await storageEntries()).toEqual([])
  })

  it('fails when an app has no dist directory', async () => {
    await createAppFixture('unbuilt-app', { withDist: false })

    await expect(run()).rejects.toMatchObject({
      name: 'AppSyncError',
      appDir: 'unbuilt-app',
      errorCode: 'APP_DIST_MISSING',
    })
  })

  it('fails when the manifest is not valid JSON', async () => {
    await createAppFixture('broken-app', { manifest: '{ not json' })

    await expect(run()).rejects.toMatchObject({
      name: 'AppSyncError',
      appDir: 'broken-app',
      errorCode: 'MANIFEST_INVALID_JSON',
    })
  })

  it('fails when the manifest is missing required fields', async () => {
    await createAppFixture('incomplete-app', { manifest: { id: 'incomplete-app' } })

    await expect(run()).rejects.toMatchObject({
      name: 'AppSyncError',
      appDir: 'incomplete-app',
      errorCode: 'MANIFEST_VALIDATION_FAILED',
    })
  })

  it('fails when a declared entry file does not exist', async () => {
    await createAppFixture('missing-entry-app', {
      manifest: {
        id: 'missing-entry-app',
        displayName: 'Missing Entry',
        version: '1.0.0',
        frontend: { entry: 'frontend/index.js' },
      },
    })

    await expect(run()).rejects.toMatchObject({
      name: 'AppSyncError',
      appDir: 'missing-entry-app',
      errorCode: 'APP_ENTRYPOINT_NOT_FOUND',
    })
  })

  it('fails when a declared entry escapes the package', async () => {
    await createAppFixture('escaping-app', {
      manifest: {
        id: 'escaping-app',
        displayName: 'Escaping App',
        version: '1.0.0',
        backend: { entry: '../../outside.js' },
      },
    })

    await expect(run()).rejects.toMatchObject({
      name: 'AppSyncError',
      appDir: 'escaping-app',
      errorCode: 'APP_ENTRYPOINT_INVALID_PATH',
    })
  })

  it('fails when manifest.id does not match the directory name', async () => {
    await createAppFixture('echo-app', {
      manifest: { id: 'other-name', displayName: 'Echo App', version: '1.0.0' },
    })

    await expect(run()).rejects.toMatchObject({
      name: 'AppSyncError',
      appDir: 'echo-app',
      errorCode: 'APP_ID_DIRECTORY_MISMATCH',
    })
  })

  it('names the offending app and the violation in the error message', async () => {
    await createAppFixture('echo-app', {
      manifest: { id: 'other-name', displayName: 'Echo App', version: '1.0.0' },
    })

    await expect(run()).rejects.toThrow(/echo-app/)
    await expect(run()).rejects.toThrow(/other-name/)
  })

  it('leaves storage completely unmutated when any app fails validation', async () => {
    await mkdir(join(storagePath, 'pre-existing'), { recursive: true })
    await writeFileAt(join(storagePath, 'pre-existing', 'marker.txt'), 'untouched')
    await createAppFixture('a-valid-app', {
      manifest: { id: 'a-valid-app', displayName: 'Valid', version: '1.0.0' },
    })
    await createAppFixture('b-broken-app', { manifest: { id: 'b-broken-app' } })

    await expect(run()).rejects.toBeInstanceOf(AppSyncError)

    expect(await storageEntries()).toEqual(['pre-existing'])
    expect(await readFile(join(storagePath, 'pre-existing', 'marker.txt'), 'utf-8')).toBe(
      'untouched',
    )
  })
})
