import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, type Ref } from 'vue'
import { vuetify } from '../../../plugins/vuetify'
import AppFrontendHost from '../AppFrontendHost.vue'

vi.mock('../../../composables/useAppFrontendLoader', () => ({
  useAppFrontendLoader: vi.fn(),
}))

import { useAppFrontendLoader } from '../../../composables/useAppFrontendLoader'

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('AppFrontendHost', () => {
  let load: ReturnType<typeof vi.fn>
  let unload: ReturnType<typeof vi.fn>
  let loading: Ref<boolean>
  let error: Ref<string | null>

  beforeEach(() => {
    vi.clearAllMocks()
    load = vi.fn().mockResolvedValue(undefined)
    unload = vi.fn().mockResolvedValue(undefined)
    loading = ref(false)
    error = ref(null)
    vi.mocked(useAppFrontendLoader).mockReturnValue({ load, unload, loading, error })
  })

  it('shows a loading state while the load is pending', async () => {
    loading.value = true
    const wrapper = mount(AppFrontendHost, {
      props: { appId: 'widget-app', entry: 'frontend/index.js' },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it("passes the component's own container element to the loader and calls load with appId/entry", async () => {
    const wrapper = mount(AppFrontendHost, {
      props: { appId: 'widget-app', entry: 'frontend/index.js' },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    const containerArg = vi.mocked(useAppFrontendLoader).mock.calls[0]?.[0] as Ref<HTMLElement | null>
    expect(containerArg.value).toBeInstanceOf(HTMLElement)
    expect(wrapper.element.contains(containerArg.value)).toBe(true)
    expect(load).toHaveBeenCalledWith('widget-app', 'frontend/index.js')
  })

  it('renders a v-alert error state instead of a blank container on failure', async () => {
    error.value = 'Failed to load app frontend'
    const wrapper = mount(AppFrontendHost, {
      props: { appId: 'widget-app', entry: 'frontend/index.js' },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load app frontend')
  })

  it('calls unmount when the component unmounts', async () => {
    const wrapper = mount(AppFrontendHost, {
      props: { appId: 'widget-app', entry: 'frontend/index.js' },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    wrapper.unmount()

    expect(unload).toHaveBeenCalledTimes(1)
  })
})
