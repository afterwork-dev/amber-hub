import { ref, type Ref } from 'vue'
import { buildAppResourceUrl } from '../services/appService'
import { dynamicImport } from './dynamicImport'

export interface AppMountContext {
  appId: string
}

export interface AppFrontendModule {
  mount(root: ShadowRoot, context: AppMountContext): void
  unmount(root: ShadowRoot): void
}

export interface UseAppFrontendLoader {
  load(appId: string, entry: string): Promise<void>
  unload(): Promise<void>
  loading: Ref<boolean>
  error: Ref<string | null>
}

export function useAppFrontendLoader(container: Ref<HTMLElement | null>): UseAppFrontendLoader {
  const loading = ref(false)
  const error = ref<string | null>(null)
  let currentModule: AppFrontendModule | null = null
  let shadowRoot: ShadowRoot | null = null

  function getOrCreateShadowRoot(): ShadowRoot {
    if (!shadowRoot) {
      if (!container.value) {
        throw new Error('No container element to mount the app frontend into')
      }
      shadowRoot = container.value.attachShadow({ mode: 'open' })
    }
    return shadowRoot
  }

  async function unload(): Promise<void> {
    if (currentModule && shadowRoot) {
      currentModule.unmount(shadowRoot)
    }
    currentModule = null
  }

  async function load(appId: string, entry: string): Promise<void> {
    await unload()
    loading.value = true
    error.value = null

    try {
      const module = (await dynamicImport(buildAppResourceUrl(appId, entry))) as AppFrontendModule

      const root = getOrCreateShadowRoot()
      module.mount(root, { appId })
      currentModule = module
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load app frontend'
    } finally {
      loading.value = false
    }
  }

  return { load, unload, loading, error }
}
