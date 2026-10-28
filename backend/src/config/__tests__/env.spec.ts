import { describe, it, expect, afterEach, vi } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('PORT', () => {
  const originalPort = process.env.PORT

  afterEach(() => {
    process.env.PORT = originalPort
    vi.resetModules()
  })

  it('defaults to 3000 when PORT is not set', async () => {
    delete process.env.PORT
    vi.resetModules()

    const { PORT } = await import('../env')

    expect(PORT).toBe(3000)
  })

  it('uses the PORT environment variable when set', async () => {
    process.env.PORT = '4000'
    vi.resetModules()

    const { PORT } = await import('../env')

    expect(PORT).toBe(4000)
  })
})

describe('getMongodbUri', () => {
  const originalMongodbUri = process.env.MONGODB_URI

  afterEach(() => {
    process.env.MONGODB_URI = originalMongodbUri
    vi.resetModules()
  })

  it('returns the MONGODB_URI environment variable when set', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/amber-hub'
    vi.resetModules()

    const { getMongodbUri } = await import('../env')

    expect(getMongodbUri()).toBe('mongodb://localhost:27017/amber-hub')
  })

  it('throws when MONGODB_URI is not set', async () => {
    delete process.env.MONGODB_URI
    vi.resetModules()

    const { getMongodbUri } = await import('../env')

    expect(() => getMongodbUri()).toThrow('MONGODB_URI environment variable is required')
  })
})

describe('getJwtRefreshExpiresIn', () => {
  const originalJwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN

  afterEach(() => {
    process.env.JWT_REFRESH_EXPIRES_IN = originalJwtRefreshExpiresIn
    vi.resetModules()
  })

  it('defaults to 7d when JWT_REFRESH_EXPIRES_IN is not set', async () => {
    delete process.env.JWT_REFRESH_EXPIRES_IN
    vi.resetModules()

    const { getJwtRefreshExpiresIn } = await import('../env')

    expect(getJwtRefreshExpiresIn()).toBe('7d')
  })

  it('uses the JWT_REFRESH_EXPIRES_IN environment variable when set', async () => {
    process.env.JWT_REFRESH_EXPIRES_IN = '30d'
    vi.resetModules()

    const { getJwtRefreshExpiresIn } = await import('../env')

    expect(getJwtRefreshExpiresIn()).toBe('30d')
  })
})

describe('getAppsStoragePath', () => {
  it('is a fixed location inside the backend package, with no environment override', async () => {
    process.env.APPS_STORAGE_PATH = '/should/be/ignored'
    vi.resetModules()

    const { getAppsStoragePath } = await import('../env')

    expect(getAppsStoragePath()).toBe(resolve(BACKEND_ROOT, 'apps-data'))

    delete process.env.APPS_STORAGE_PATH
  })

  it('does not depend on the working directory', async () => {
    vi.resetModules()

    const { getAppsStoragePath } = await import('../env')

    expect(getAppsStoragePath()).toBe(resolve(BACKEND_ROOT, 'apps-data'))
    expect(getAppsStoragePath().startsWith(process.cwd())).toBe(
      BACKEND_ROOT.startsWith(process.cwd()),
    )
  })
})
