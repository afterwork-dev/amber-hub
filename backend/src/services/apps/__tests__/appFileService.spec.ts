import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AppError } from '../../../errors/AppError'
import { resolveAppFile } from '../appFileService'

// App storage has no environment override — it is a fixed, derived location. Tests isolate
// themselves by mocking the config module so each run points at its own temp directory.
const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})


describe('resolveAppFile', () => {
  let appsStoragePath: string

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'app-file-service-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  async function createApp(appId: string): Promise<void> {
    await mkdir(join(appsStoragePath, appId, 'frontend'), { recursive: true })
    await writeFile(
      join(appsStoragePath, appId, 'frontend', 'index.js'),
      'export function mount() {}',
      'utf-8',
    )
  }

  it('resolves the absolute location of an existing file under an existing app', async () => {
    await createApp('sample-app')

    const result = await resolveAppFile('sample-app', 'frontend/index.js')

    expect(result).toBe(join(appsStoragePath, 'sample-app', 'frontend', 'index.js'))
  })

  it('throws APP_FILE_NOT_FOUND for a path that escapes the app directory', async () => {
    await createApp('sample-app')

    const error: AppError = await resolveAppFile('sample-app', '../other-app/secret.txt').catch(
      (err) => err,
    )

    expect(error).toBeInstanceOf(AppError)
    expect(error.errorCode).toBe('APP_FILE_NOT_FOUND')
  })

  it('throws APP_NOT_FOUND for an unknown appId', async () => {
    const error: AppError = await resolveAppFile('unknown-app', 'frontend/index.js').catch(
      (err) => err,
    )

    expect(error).toBeInstanceOf(AppError)
    expect(error.errorCode).toBe('APP_NOT_FOUND')
  })

  it('throws APP_FILE_NOT_FOUND for a missing file under a known app', async () => {
    await createApp('sample-app')

    const error: AppError = await resolveAppFile('sample-app', 'frontend/missing.js').catch(
      (err) => err,
    )

    expect(error).toBeInstanceOf(AppError)
    expect(error.errorCode).toBe('APP_FILE_NOT_FOUND')
  })
})
