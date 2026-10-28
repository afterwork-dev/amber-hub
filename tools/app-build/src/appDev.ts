import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncApps } from './syncApps'
import { APPS_ROOT } from './storagePath'

const IGNORED_SEGMENTS = new Set(['node_modules', '.git'])

/**
 * Whether a path reported by the watcher (relative to the app workspace) should trigger a
 * rebuild. Build output is excluded so the resync it produces cannot feed back into itself.
 */
export function isRebuildTrigger(changedPath: string | null): boolean {
  if (!changedPath) {
    return false
  }

  const segments = changedPath.split(sep).filter((segment) => segment !== '')
  if (segments.length === 0 || segments[0] === 'dist') {
    return false
  }

  return !segments.some((segment) => IGNORED_SEGMENTS.has(segment))
}

export interface RebuildDeps {
  runBuild: () => Promise<void>
  sync: () => Promise<unknown>
  log: (message: string) => void
  onError: (error: unknown) => void
}

/**
 * Builds the rebuild-on-change handler. Changes arriving while a rebuild is in flight are
 * coalesced into a single follow-up run, and neither a failing build nor a failing sync is
 * allowed to tear down the watch loop.
 */
export function createRebuildHandler(
  deps: RebuildDeps,
): (changedPath: string | null) => Promise<void> {
  let running = false
  let pending = false

  async function runOnce(): Promise<void> {
    try {
      await deps.runBuild()
      await deps.sync()
      deps.log('Resynced after change.')
    } catch (error) {
      deps.onError(error)
    }
  }

  return async function handle(changedPath: string | null): Promise<void> {
    if (!isRebuildTrigger(changedPath)) {
      return
    }

    if (running) {
      pending = true
      return
    }

    running = true
    await runOnce()
    while (pending) {
      pending = false
      await runOnce()
    }
    running = false
  }
}

function runAppBuild(appDir: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('npm', ['run', 'build'], { cwd: appDir, stdio: 'inherit' })
    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      rejectPromise(new Error(`App build failed with exit code ${code ?? 'unknown'}`))
    })
  })
}

async function main(): Promise<void> {
  const appId = process.argv[2]
  if (!appId) {
    console.error('Usage: npm run app:dev -- <app-id>')
    process.exitCode = 1
    return
  }

  const appDir = join(APPS_ROOT, appId)
  const isWorkspace = await stat(join(appDir, 'package.json'))
    .then((stats) => stats.isFile())
    .catch(() => false)
  if (!isWorkspace) {
    console.error(`No app workspace found at apps/${appId} (expected a package.json there).`)
    process.exitCode = 1
    return
  }

  const handler = createRebuildHandler({
    runBuild: () => runAppBuild(appDir),
    sync: () => syncApps(),
    log: (message) => console.log(`[${appId}] ${message}`),
    onError: (error) => console.error(`[${appId}] Rebuild failed:`, error),
  })

  await handler('manifest.json')
  console.log(`[${appId}] Watching apps/${appId} — refresh the browser to pick up frontend changes.`)
  console.log(`[${appId}] Backend changes need a "npm run dev:backend" restart.`)

  watch(appDir, { recursive: true }, (_event, filename) => {
    void handler(filename)
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main()
}
