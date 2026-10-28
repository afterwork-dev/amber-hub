import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  callTool,
  getBackendStatusForTests,
  listPublishedTools,
  resetAppBackendsForTests,
  startBackendIfDeclared,
} from '../appBackendManager'

const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const ALICE = { id: 'user-1', username: 'alice' }

async function installFixtureApp(appId: string, fixtureFile: string): Promise<void> {
  const appDir = join(storage.path, appId)
  await mkdir(appDir, { recursive: true })
  await writeFile(
    join(appDir, 'manifest.json'),
    JSON.stringify({ id: appId, displayName: appId, version: '1.0.0', backend: { entry: 'index.js' } }),
    'utf-8',
  )
  await copyFile(join(FIXTURES_DIR, fixtureFile), join(appDir, 'index.js'))
}

async function waitUntilStatus(appId: string, status: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (getBackendStatusForTests(appId)?.status === status) {
      return
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20))
  }
  throw new Error(`Timed out waiting for "${appId}" to reach status "${status}"`)
}

async function waitForRunningPidOtherThan(
  appId: string,
  previousPid: number | undefined,
  timeoutMs = 5000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const current = getBackendStatusForTests(appId)
    if (current?.status === 'running' && current.pid !== undefined && current.pid !== previousPid) {
      return current.pid
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20))
  }
  throw new Error(`Timed out waiting for "${appId}" to restart with a new pid`)
}

describe('appBackendManager tools', () => {
  const originalCallTimeout = process.env.APP_BACKEND_CALL_TIMEOUT_MS

  beforeEach(async () => {
    storage.path = await mkdtemp(join(tmpdir(), 'app-backend-tools-'))
  })

  afterEach(async () => {
    resetAppBackendsForTests()
    process.env.APP_BACKEND_CALL_TIMEOUT_MS = originalCallTimeout
    await rm(storage.path, { recursive: true, force: true })
  })

  it('publishes a running backend’s tools, sorted by presented name, with annotations only where declared', async () => {
    await installFixtureApp('tool-app', 'toolApp.js')
    await startBackendIfDeclared('tool-app')

    const tools = listPublishedTools()

    expect(tools.map((tool) => tool.presentedName)).toEqual([
      'tool-app_echo',
      'tool-app_fail',
      'tool-app_slow',
      'tool-app_whoami',
    ])
    const echo = tools.find((tool) => tool.name === 'echo')
    expect(echo?.description).toBe('Echoes the given text.')
    expect(echo?.annotations).toEqual({ readOnlyHint: true })
    expect(tools.find((tool) => tool.name === 'whoami')?.annotations).toBeUndefined()
  }, 10000)

  it('runs a tool as the given caller', async () => {
    await installFixtureApp('tool-app', 'toolApp.js')
    await startBackendIfDeclared('tool-app')

    await expect(callTool('tool-app', 'whoami', {}, ALICE)).resolves.toEqual({ calledBy: 'alice' })
    await expect(callTool('tool-app', 'echo', { text: 'hi' }, ALICE)).resolves.toBe('hi')
  }, 10000)

  it('rejects a tool call for an unknown app or an app without a backend', async () => {
    await installFixtureApp('no-backend', 'toolApp.js')
    await rm(join(storage.path, 'no-backend', 'index.js'))
    await writeFile(
      join(storage.path, 'no-backend', 'manifest.json'),
      JSON.stringify({ id: 'no-backend', displayName: 'no-backend', version: '1.0.0' }),
      'utf-8',
    )

    await expect(callTool('nope', 'whoami', {}, ALICE)).rejects.toMatchObject({
      errorCode: 'APP_NOT_FOUND',
    })
    await expect(callTool('no-backend', 'whoami', {}, ALICE)).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_NOT_DECLARED',
    })
  })

  it('rejects with APP_BACKEND_TIMEOUT when the tool exceeds the call timeout', async () => {
    process.env.APP_BACKEND_CALL_TIMEOUT_MS = '100'
    await installFixtureApp('tool-app', 'toolApp.js')
    await startBackendIfDeclared('tool-app')

    await expect(callTool('tool-app', 'slow', {}, ALICE)).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_TIMEOUT',
    })
  }, 10000)

  it('clears an app’s tools when its backend goes away for good', async () => {
    await installFixtureApp('tool-app', 'toolApp.js')
    await startBackendIfDeclared('tool-app')

    const firstPid = getBackendStatusForTests('tool-app')?.pid
    process.kill(firstPid!, 'SIGKILL')
    const secondPid = await waitForRunningPidOtherThan('tool-app', firstPid)
    process.kill(secondPid, 'SIGKILL')
    await waitUntilStatus('tool-app', 'crashed')

    expect(listPublishedTools()).toEqual([])
    await expect(callTool('tool-app', 'whoami', {}, ALICE)).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_CRASHED',
    })
  }, 15000)

  it('publishes only the valid tools of an app with bad declarations, and keeps its routes working', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await installFixtureApp('invalid-tool-app', 'invalidToolApp.js')
    await startBackendIfDeclared('invalid-tool-app')

    expect(listPublishedTools().map((tool) => tool.presentedName)).toEqual(['invalid-tool-app_ok'])
    expect(errorSpy).toHaveBeenCalled()
    for (const call of errorSpy.mock.calls) {
      expect(String(call[0])).toContain('invalid-tool-app')
    }
  }, 10000)

  it('publishes nothing for a backend that declares no tools', async () => {
    await installFixtureApp('echo-app', 'echoApp.js')
    await startBackendIfDeclared('echo-app')

    expect(listPublishedTools()).toEqual([])
  }, 10000)
})
