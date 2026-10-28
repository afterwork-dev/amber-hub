import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('../dynamicImport', () => ({
  dynamicImport: vi.fn(),
}))

import { dynamicImport } from '../dynamicImport'
import { useAppFrontendLoader } from '../useAppFrontendLoader'

describe('useAppFrontendLoader', () => {
  let fakeShadowRoot: { id: string }
  let fakeContainer: { attachShadow: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    fakeShadowRoot = { id: 'shadow-root' }
    fakeContainer = { attachShadow: vi.fn().mockReturnValue(fakeShadowRoot) }
  })

  function createLoader() {
    const container = ref(fakeContainer as unknown as HTMLElement)
    return { container, loader: useAppFrontendLoader(container) }
  }

  it("imports the entry's resource URL directly and calls mount with the shadow root", async () => {
    const mountFn = vi.fn()
    vi.mocked(dynamicImport).mockResolvedValue({ mount: mountFn, unmount: vi.fn() })

    const { loader } = createLoader()
    await loader.load('widget-app', 'frontend/index.js')

    expect(dynamicImport).toHaveBeenCalledWith('/resources/widget-app/frontend/frontend/index.js')
    expect(mountFn).toHaveBeenCalledWith(fakeShadowRoot, { appId: 'widget-app' })
    expect(loader.loading.value).toBe(false)
    expect(loader.error.value).toBeNull()
  })

  it('unmounts the previously mounted module before mounting a new one', async () => {
    const firstUnmount = vi.fn()
    const secondMount = vi.fn()
    vi.mocked(dynamicImport)
      .mockResolvedValueOnce({ mount: vi.fn(), unmount: firstUnmount })
      .mockResolvedValueOnce({ mount: secondMount, unmount: vi.fn() })

    const { loader } = createLoader()
    await loader.load('widget-app', 'frontend/index.js')
    await loader.load('other-app', 'frontend/index.js')

    expect(firstUnmount).toHaveBeenCalledWith(fakeShadowRoot)
    expect(firstUnmount).toHaveBeenCalledTimes(1)
    expect(secondMount).toHaveBeenCalledWith(fakeShadowRoot, { appId: 'other-app' })
  })

  it('surfaces an import failure as an error state rather than an unhandled rejection', async () => {
    vi.mocked(dynamicImport).mockRejectedValue(new Error('Failed to fetch dynamically imported module'))

    const { loader } = createLoader()
    await loader.load('widget-app', 'frontend/index.js')

    expect(loader.error.value).toBe('Failed to fetch dynamically imported module')
    expect(loader.loading.value).toBe(false)
  })

  it('surfaces a thrown mount error as an error state rather than an unhandled rejection', async () => {
    vi.mocked(dynamicImport).mockResolvedValue({
      mount: vi.fn().mockImplementation(() => {
        throw new Error('mount blew up')
      }),
      unmount: vi.fn(),
    })

    const { loader } = createLoader()
    await loader.load('widget-app', 'frontend/index.js')

    expect(loader.error.value).toBe('mount blew up')
  })

  it('explicit teardown calls unmount exactly once', async () => {
    const unmountFn = vi.fn()
    vi.mocked(dynamicImport).mockResolvedValue({ mount: vi.fn(), unmount: unmountFn })

    const { loader } = createLoader()
    await loader.load('widget-app', 'frontend/index.js')
    await loader.unload()
    await loader.unload()

    expect(unmountFn).toHaveBeenCalledTimes(1)
    expect(unmountFn).toHaveBeenCalledWith(fakeShadowRoot)
  })
})
