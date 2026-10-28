import { access, cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ManifestError, validateManifest } from './manifestValidator'
import { APPS_ROOT, resolveStoragePath } from './storagePath'

/** A build-time failure for one app workspace, naming the offending directory. */
export class AppSyncError extends Error {
  readonly appDir: string
  readonly errorCode: string
  readonly details: string[]

  constructor(appDir: string, errorCode: string, message: string, details: string[] = []) {
    super(message)
    this.name = 'AppSyncError'
    this.appDir = appDir
    this.errorCode = errorCode
    this.details = details
  }
}

export interface SyncOptions {
  appsRoot?: string
  storagePath?: string
}

export interface SyncedApp {
  id: string
  distDir: string
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function listAppWorkspaces(appsRoot: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(appsRoot, { withFileTypes: true })
  } catch {
    return []
  }

  const candidates = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  const workspaces = await Promise.all(
    candidates.map(async (name) =>
      (await exists(join(appsRoot, name, 'package.json'))) ? name : null,
    ),
  )

  return workspaces.filter((name): name is string => name !== null).sort()
}

async function validateAppWorkspace(appsRoot: string, dirName: string): Promise<SyncedApp> {
  const distDir = join(appsRoot, dirName, 'dist')

  if (!(await isDirectory(distDir))) {
    throw new AppSyncError(
      dirName,
      'APP_DIST_MISSING',
      `App "${dirName}" has no dist/ directory — run its build before syncing.`,
    )
  }

  const manifest = await validateManifest(distDir).catch((error: unknown) => {
    if (error instanceof ManifestError) {
      throw new AppSyncError(
        dirName,
        error.code,
        `App "${dirName}" produced an invalid package: ${error.message}`,
        error.details,
      )
    }
    throw error
  })

  if (manifest.id !== dirName) {
    throw new AppSyncError(
      dirName,
      'APP_ID_DIRECTORY_MISMATCH',
      `App "${dirName}" declares id "${manifest.id}" — manifest.id must equal the directory name.`,
    )
  }

  return { id: manifest.id, distDir }
}

async function removeStaleEntries(storagePath: string, apps: SyncedApp[]): Promise<void> {
  const keep = new Set(apps.map((app) => app.id))
  const existing = await readdir(storagePath, { withFileTypes: true })

  await Promise.all(
    existing
      .filter((entry) => !keep.has(entry.name))
      .map((entry) => rm(join(storagePath, entry.name), { recursive: true, force: true })),
  )
}

async function reconcileStorage(storagePath: string, apps: SyncedApp[]): Promise<void> {
  await mkdir(storagePath, { recursive: true })
  await removeStaleEntries(storagePath, apps)

  await Promise.all(
    apps.map(async (app) => {
      const target = join(storagePath, app.id)
      await rm(target, { recursive: true, force: true })
      await cp(app.distDir, target, { recursive: true })
    }),
  )
}

/**
 * Validates every app workspace's built package, then reconciles app storage so it holds
 * exactly those apps. Validation completes for all apps before storage is touched, so a
 * failure anywhere leaves storage unmutated.
 */
export async function syncApps(options: SyncOptions = {}): Promise<SyncedApp[]> {
  const appsRoot = options.appsRoot ?? APPS_ROOT
  const storagePath = options.storagePath ?? resolveStoragePath()

  const workspaces = await listAppWorkspaces(appsRoot)
  const apps: SyncedApp[] = []
  for (const dirName of workspaces) {
    apps.push(await validateAppWorkspace(appsRoot, dirName))
  }

  await reconcileStorage(storagePath, apps)
  return apps
}

async function main(): Promise<void> {
  try {
    const apps = await syncApps()
    console.log(
      apps.length === 0
        ? 'Synced 0 apps — app storage is empty.'
        : `Synced ${apps.length} app(s): ${apps.map((app) => app.id).join(', ')}`,
    )
  } catch (error) {
    if (error instanceof AppSyncError) {
      console.error(`App sync failed: ${error.message}`)
      error.details.forEach((detail) => console.error(`  - ${detail}`))
    } else {
      console.error('App sync failed:', error)
    }
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main()
}
