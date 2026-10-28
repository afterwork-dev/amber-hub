import { access, readFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

const MANIFEST_FILENAME = 'manifest.json'
const APP_ID_PATTERN = /^[a-z0-9-]+$/

export interface AppManifest {
  id: string
  displayName: string
  version: string
  frontend?: { entry: string }
  backend?: { entry: string }
}

/** A build-time manifest rejection. Carries the same codes the Hub's error catalog uses. */
export class ManifestError extends Error {
  readonly code: string
  readonly details: string[]

  constructor(code: string, message: string, details: string[] = []) {
    super(message)
    this.name = 'ManifestError'
    this.code = code
    this.details = details
  }
}

function isPathWithin(baseDir: string, candidatePath: string): boolean {
  const resolvedBase = resolve(baseDir)
  const resolvedCandidate = resolve(candidatePath)
  return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(resolvedBase + sep)
}

function collectFieldIssues(parsed: Partial<AppManifest>): string[] {
  const issues: string[] = []
  if (typeof parsed.id !== 'string' || !APP_ID_PATTERN.test(parsed.id)) {
    issues.push('Field "id" must be a non-empty string matching ^[a-z0-9-]+$')
  }
  if (typeof parsed.displayName !== 'string' || parsed.displayName.trim() === '') {
    issues.push('Missing required field: displayName')
  }
  if (typeof parsed.version !== 'string' || parsed.version.trim() === '') {
    issues.push('Missing required field: version')
  }
  if (parsed.frontend !== undefined) {
    if (typeof parsed.frontend !== 'object' || parsed.frontend === null) {
      issues.push('Field "frontend" must be an object')
    } else if (typeof parsed.frontend.entry !== 'string' || parsed.frontend.entry.trim() === '') {
      issues.push('Field "frontend.entry" must be a non-empty string')
    }
  }
  if (parsed.backend !== undefined) {
    if (typeof parsed.backend !== 'object' || parsed.backend === null) {
      issues.push('Field "backend" must be an object')
    } else if (typeof parsed.backend.entry !== 'string' || parsed.backend.entry.trim() === '') {
      issues.push('Field "backend.entry" must be a non-empty string')
    }
  }
  return issues
}

async function validateEntryPath(
  packageDir: string,
  fieldName: 'frontend' | 'backend',
  entry: string,
): Promise<void> {
  const resolvedEntry = join(packageDir, entry)

  if (!isPathWithin(packageDir, resolvedEntry)) {
    throw new ManifestError('APP_ENTRYPOINT_INVALID_PATH', 'App manifest failed validation.', [
      `${fieldName}.entry "${entry}" resolves outside the app package`,
    ])
  }

  try {
    await access(resolvedEntry)
  } catch {
    throw new ManifestError('APP_ENTRYPOINT_NOT_FOUND', 'App manifest failed validation.', [
      `${fieldName}.entry "${entry}" was not found in the app package`,
    ])
  }
}

/**
 * Validates a built app package directory: manifest present, parseable, schema-valid, and
 * every declared entry existing inside the package.
 */
export async function validateManifest(packageDir: string): Promise<AppManifest> {
  let raw: string
  try {
    raw = await readFile(join(packageDir, MANIFEST_FILENAME), 'utf-8')
  } catch {
    throw new ManifestError('MANIFEST_MISSING', 'App package is missing its manifest.json file.')
  }

  let parsed: Partial<AppManifest>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ManifestError('MANIFEST_INVALID_JSON', 'App manifest could not be parsed as JSON.')
  }

  const issues = collectFieldIssues(parsed)
  if (issues.length > 0) {
    throw new ManifestError('MANIFEST_VALIDATION_FAILED', 'App manifest failed validation.', issues)
  }

  if (parsed.frontend) {
    await validateEntryPath(packageDir, 'frontend', parsed.frontend.entry)
  }

  if (parsed.backend) {
    await validateEntryPath(packageDir, 'backend', parsed.backend.entry)
  }

  return parsed as AppManifest
}
