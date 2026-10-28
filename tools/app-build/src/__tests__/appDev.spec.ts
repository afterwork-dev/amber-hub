import { describe, expect, it, vi } from 'vitest'
import { createRebuildHandler, isRebuildTrigger } from '../appDev'

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function makeDeps(overrides: Partial<Parameters<typeof createRebuildHandler>[0]> = {}) {
  return {
    runBuild: vi.fn(async () => {}),
    sync: vi.fn(async () => {}),
    log: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  }
}

describe('isRebuildTrigger', () => {
  it('triggers on a source file change', () => {
    expect(isRebuildTrigger('frontend/index.js')).toBe(true)
    expect(isRebuildTrigger('manifest.json')).toBe(true)
  })

  it('ignores changes inside the build output to avoid a rebuild feedback loop', () => {
    expect(isRebuildTrigger('dist')).toBe(false)
    expect(isRebuildTrigger('dist/manifest.json')).toBe(false)
    expect(isRebuildTrigger('dist/frontend/index.js')).toBe(false)
  })

  it('ignores dependency and git directories at any depth', () => {
    expect(isRebuildTrigger('node_modules/vue/index.js')).toBe(false)
    expect(isRebuildTrigger('frontend/node_modules/thing.js')).toBe(false)
    expect(isRebuildTrigger('.git/index')).toBe(false)
  })

  it('ignores a missing filename', () => {
    expect(isRebuildTrigger(null)).toBe(false)
  })

  it('does not mistake a source file whose name merely starts with dist', () => {
    expect(isRebuildTrigger('frontend/dist-helper.js')).toBe(true)
  })
})

describe('createRebuildHandler', () => {
  it('rebuilds and resyncs on a source change', async () => {
    const deps = makeDeps()
    const handler = createRebuildHandler(deps)

    await handler('frontend/index.js')

    expect(deps.runBuild).toHaveBeenCalledTimes(1)
    expect(deps.sync).toHaveBeenCalledTimes(1)
    expect(deps.log).toHaveBeenCalled()
  })

  it('does nothing for an ignored path', async () => {
    const deps = makeDeps()
    const handler = createRebuildHandler(deps)

    await handler('dist/frontend/index.js')

    expect(deps.runBuild).not.toHaveBeenCalled()
    expect(deps.sync).not.toHaveBeenCalled()
  })

  it('syncs only after the build succeeds', async () => {
    const order: string[] = []
    const deps = makeDeps({
      runBuild: vi.fn(async () => {
        order.push('build')
      }),
      sync: vi.fn(async () => {
        order.push('sync')
      }),
    })

    await createRebuildHandler(deps)('manifest.json')

    expect(order).toEqual(['build', 'sync'])
  })

  it('reports a failing build without resyncing or crashing the watch loop', async () => {
    const failure = new Error('build blew up')
    const deps = makeDeps({
      runBuild: vi.fn(async () => {
        throw failure
      }),
    })
    const handler = createRebuildHandler(deps)

    await expect(handler('frontend/index.js')).resolves.toBeUndefined()

    expect(deps.onError).toHaveBeenCalledWith(failure)
    expect(deps.sync).not.toHaveBeenCalled()
  })

  it('reports a failing sync without crashing the watch loop', async () => {
    const failure = new Error('sync blew up')
    const deps = makeDeps({
      sync: vi.fn(async () => {
        throw failure
      }),
    })

    await expect(createRebuildHandler(deps)('frontend/index.js')).resolves.toBeUndefined()

    expect(deps.onError).toHaveBeenCalledWith(failure)
  })

  it('coalesces changes arriving during an in-flight rebuild into one follow-up run', async () => {
    const gate = deferred()
    const deps = makeDeps({
      runBuild: vi.fn(() => gate.promise),
    })
    const handler = createRebuildHandler(deps)

    const first = handler('frontend/index.js')
    const second = handler('frontend/index.js')
    const third = handler('backend/index.js')
    gate.resolve()
    await Promise.all([first, second, third])

    expect(deps.runBuild).toHaveBeenCalledTimes(2)
  })

  it('does not queue a follow-up run for ignored paths seen during a rebuild', async () => {
    const gate = deferred()
    const deps = makeDeps({
      runBuild: vi.fn(() => gate.promise),
    })
    const handler = createRebuildHandler(deps)

    const first = handler('frontend/index.js')
    const ignored = handler('dist/frontend/index.js')
    gate.resolve()
    await Promise.all([first, ignored])

    expect(deps.runBuild).toHaveBeenCalledTimes(1)
  })
})
