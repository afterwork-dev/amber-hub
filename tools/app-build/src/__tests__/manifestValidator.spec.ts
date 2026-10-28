import { describe, it, expect, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ManifestError, validateManifest } from '../manifestValidator'

describe('validateManifest', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
  })

  async function createDirWithManifest(content: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'manifest-validator-'))
    tempDirs.push(dir)
    await writeFile(join(dir, 'manifest.json'), content, 'utf-8')
    return dir
  }

  it('returns the parsed manifest for a well-formed manifest', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' }),
    )

    const result = await validateManifest(dir)

    expect(result).toEqual({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' })
  })

  it('throws MANIFEST_MISSING when manifest.json is absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'manifest-validator-'))
    tempDirs.push(dir)

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_MISSING')
    expect(error.details).toEqual([])
  })

  it('throws MANIFEST_INVALID_JSON when manifest.json is not valid JSON', async () => {
    const dir = await createDirWithManifest('{not valid json')

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_INVALID_JSON')
    expect(error.details).toEqual([])
  })

  it('throws MANIFEST_VALIDATION_FAILED with one detail per invalid/missing field, collected in one pass', async () => {
    const dir = await createDirWithManifest(JSON.stringify({ id: 'Not A Valid Id!', version: '' }))

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_VALIDATION_FAILED')
    expect(error.details).toEqual([
      'Field "id" must be a non-empty string matching ^[a-z0-9-]+$',
      'Missing required field: displayName',
      'Missing required field: version',
    ])
  })

  it('returns the parsed manifest with frontend passed through unchanged when the entry file exists', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        frontend: { entry: 'frontend/index.js' },
      }),
    )
    await mkdir(join(dir, 'frontend'), { recursive: true })
    await writeFile(join(dir, 'frontend', 'index.js'), 'export function mount() {}', 'utf-8')

    const result = await validateManifest(dir)

    expect(result).toEqual({
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
      frontend: { entry: 'frontend/index.js' },
    })
  })

  it('throws APP_ENTRYPOINT_NOT_FOUND when frontend.entry references a file that does not exist', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        frontend: { entry: 'frontend/index.js' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('APP_ENTRYPOINT_NOT_FOUND')
  })

  it('throws APP_ENTRYPOINT_INVALID_PATH when frontend.entry escapes the extracted directory', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        frontend: { entry: '../../escape.js' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('APP_ENTRYPOINT_INVALID_PATH')
  })

  it('throws MANIFEST_VALIDATION_FAILED when frontend is present but entry is missing/empty/non-string', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        frontend: { entry: '' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_VALIDATION_FAILED')
    expect(error.details).toEqual(['Field "frontend.entry" must be a non-empty string'])
  })

  it('combines a frontend.entry shape issue with a pre-existing id/displayName/version issue in one details array', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({ id: 'Not A Valid Id!', version: '', frontend: { entry: '' } }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_VALIDATION_FAILED')
    expect(error.details).toEqual([
      'Field "id" must be a non-empty string matching ^[a-z0-9-]+$',
      'Missing required field: displayName',
      'Missing required field: version',
      'Field "frontend.entry" must be a non-empty string',
    ])
  })

  it('behaves exactly as before this feature when no frontend field is present (regression)', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' }),
    )

    const result = await validateManifest(dir)

    expect(result).toEqual({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' })
  })

  it('returns the parsed manifest with backend passed through unchanged when the entry file exists', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        backend: { entry: 'backend/index.js' },
      }),
    )
    await mkdir(join(dir, 'backend'), { recursive: true })
    await writeFile(join(dir, 'backend', 'index.js'), 'export default function init() {}', 'utf-8')

    const result = await validateManifest(dir)

    expect(result).toEqual({
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
      backend: { entry: 'backend/index.js' },
    })
  })

  it('throws APP_ENTRYPOINT_NOT_FOUND when backend.entry references a file that does not exist', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        backend: { entry: 'backend/index.js' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('APP_ENTRYPOINT_NOT_FOUND')
  })

  it('throws APP_ENTRYPOINT_INVALID_PATH when backend.entry escapes the extracted directory', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        backend: { entry: '../../escape.js' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('APP_ENTRYPOINT_INVALID_PATH')
  })

  it('throws MANIFEST_VALIDATION_FAILED when backend is present but entry is missing/empty/non-string', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        backend: { entry: '' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_VALIDATION_FAILED')
    expect(error.details).toEqual(['Field "backend.entry" must be a non-empty string'])
  })

  it('throws MANIFEST_VALIDATION_FAILED with a combined frontend.entry and backend.entry issue in one details array', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        frontend: { entry: '' },
        backend: { entry: '' },
      }),
    )

    const error: ManifestError = await validateManifest(dir).catch((err) => err)

    expect(error).toBeInstanceOf(ManifestError)
    expect(error.code).toBe('MANIFEST_VALIDATION_FAILED')
    expect(error.details).toEqual([
      'Field "frontend.entry" must be a non-empty string',
      'Field "backend.entry" must be a non-empty string',
    ])
  })

  it('returns the parsed manifest with both frontend and backend passed through unchanged when both entries exist', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({
        id: 'sample-app',
        displayName: 'Sample App',
        version: '1.0.0',
        frontend: { entry: 'frontend/index.js' },
        backend: { entry: 'backend/index.js' },
      }),
    )
    await mkdir(join(dir, 'frontend'), { recursive: true })
    await writeFile(join(dir, 'frontend', 'index.js'), 'export function mount() {}', 'utf-8')
    await mkdir(join(dir, 'backend'), { recursive: true })
    await writeFile(join(dir, 'backend', 'index.js'), 'export default function init() {}', 'utf-8')

    const result = await validateManifest(dir)

    expect(result).toEqual({
      id: 'sample-app',
      displayName: 'Sample App',
      version: '1.0.0',
      frontend: { entry: 'frontend/index.js' },
      backend: { entry: 'backend/index.js' },
    })
  })

  it('behaves exactly as before this feature when no backend field is present (regression)', async () => {
    const dir = await createDirWithManifest(
      JSON.stringify({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' }),
    )

    const result = await validateManifest(dir)

    expect(result).toEqual({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' })
  })
})
