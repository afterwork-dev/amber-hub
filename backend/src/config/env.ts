import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export const PORT = Number(process.env.PORT) || 3000

export function getMongodbUri(): string {
  const value = process.env.MONGODB_URI
  if (!value) {
    throw new Error('MONGODB_URI environment variable is required')
  }
  return value
}

export function getJwtSecret(): string {
  const value = process.env.JWT_SECRET
  if (!value) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return value
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '15m'
}

export function getJwtRefreshExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d'
}

/**
 * Where the Hub discovers installed apps. Deliberately a fixed location, not configuration:
 * this directory is derived build output, written solely by `tools/app-build`'s sync step,
 * and the two sides must agree or the Hub reads an empty directory.
 *
 * Anchored to the backend package rather than the working directory so it resolves the same
 * wherever the process is launched from, matching `resolveStoragePath()` in
 * `tools/app-build/src/storagePath.ts`. Tests that need isolation mock this module.
 */
export function getAppsStoragePath(): string {
  return resolve(BACKEND_ROOT, 'apps-data')
}

export function getFrontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
}

export function getAppBackendStartTimeoutMs(): number {
  return Number(process.env.APP_BACKEND_START_TIMEOUT_MS) || 5000
}

export function getAppBackendCallTimeoutMs(): number {
  return Number(process.env.APP_BACKEND_CALL_TIMEOUT_MS) || 10000
}

export function getMcpToolResultMaxChars(): number {
  return Number(process.env.MCP_TOOL_RESULT_MAX_CHARS) || 200000
}
