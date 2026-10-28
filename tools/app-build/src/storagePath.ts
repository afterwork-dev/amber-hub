import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Where app workspaces live. */
export const APPS_ROOT = resolve(REPO_ROOT, 'apps')

/**
 * Where built app packages are written for the Hub to discover.
 *
 * MUST stay in step with the Hub's own `getAppsStoragePath()` in `backend/src/config/env.ts`:
 * the same fixed location, both anchored to the backend package (not the working directory,
 * so neither side depends on where its process was launched from). If these two disagree, the
 * build writes apps somewhere the Hub never looks — `storagePath.spec.ts` guards against it.
 *
 * There is no environment override on either side: app storage is derived build output, not
 * something an operator configures. Tests inject a temp directory via `syncApps({ storagePath })`.
 */
export function resolveStoragePath(): string {
  return resolve(REPO_ROOT, 'backend', 'apps-data')
}
