import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { vuetify } from '../../../plugins/vuetify'
import AppViewPage from '../AppViewPage.vue'
import { useAppsStore } from '../../../stores/appsStore'

vi.mock('../../../components/apps/AppFrontendHost.vue', () => ({
  default: {
    name: 'AppFrontendHost',
    props: ['appId', 'entry'],
    template: '<div data-testid="app-frontend-host" />',
  },
}))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/apps/:appId', name: 'app-view', component: AppViewPage, props: true },
    ],
  })
}

describe('AppViewPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("renders the app's display name when appId matches an installed app", async () => {
    const router = createTestRouter()
    useAppsStore().apps = [{ id: 'sample-app', displayName: 'Sample App', frontend: null }]
    router.push('/apps/sample-app')
    await router.isReady()

    const wrapper = mount(AppViewPage, {
      props: { appId: 'sample-app' },
      global: { plugins: [vuetify, router] },
    })

    expect(wrapper.text()).toContain('Sample App')
  })

  it('redirects to the dashboard when appId does not match any installed app', async () => {
    const router = createTestRouter()
    useAppsStore().apps = [{ id: 'sample-app', displayName: 'Sample App', frontend: null }]
    router.push('/apps/unknown-app')
    await router.isReady()

    mount(AppViewPage, {
      props: { appId: 'unknown-app' },
      global: { plugins: [vuetify, router] },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('loads the apps store on mount when the apps list is empty, then redirects if the app is still missing', async () => {
    const router = createTestRouter()
    router.push('/apps/sample-app')
    await router.isReady()
    const appsStore = useAppsStore()
    appsStore.load = vi.fn().mockImplementation(async () => {
      appsStore.apps = [{ id: 'other-app', displayName: 'Other App', frontend: null }]
    })

    mount(AppViewPage, {
      props: { appId: 'sample-app' },
      global: { plugins: [vuetify, router] },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(appsStore.load).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('renders AppFrontendHost with the appId/entry when the selected app declares a frontend', async () => {
    const router = createTestRouter()
    useAppsStore().apps = [
      { id: 'widget-app', displayName: 'Widget App', frontend: { entry: 'frontend/index.js' } },
    ]
    router.push('/apps/widget-app')
    await router.isReady()

    const wrapper = mount(AppViewPage, {
      props: { appId: 'widget-app' },
      global: { plugins: [vuetify, router] },
    })

    const host = wrapper.findComponent({ name: 'AppFrontendHost' })
    expect(host.exists()).toBe(true)
    expect(host.props('appId')).toBe('widget-app')
    expect(host.props('entry')).toBe('frontend/index.js')
  })

  it('keeps rendering the existing default heading view when frontend is null (regression)', async () => {
    const router = createTestRouter()
    useAppsStore().apps = [{ id: 'sample-app', displayName: 'Sample App', frontend: null }]
    router.push('/apps/sample-app')
    await router.isReady()

    const wrapper = mount(AppViewPage, {
      props: { appId: 'sample-app' },
      global: { plugins: [vuetify, router] },
    })

    expect(wrapper.text()).toContain('Sample App')
    expect(wrapper.findComponent({ name: 'AppFrontendHost' }).exists()).toBe(false)
  })
})
