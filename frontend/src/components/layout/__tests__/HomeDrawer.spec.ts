import { describe, it, expect, beforeEach, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { VApp } from 'vuetify/components'
import HomeDrawer from '../HomeDrawer.vue'
import { vuetify } from '../../../plugins/vuetify'
import { useAppsStore } from '../../../stores/appsStore'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/apps/:appId', name: 'app-view', component: { template: '<div>App</div>' } },
    ],
  })
}

function mountHomeDrawer(router: ReturnType<typeof createTestRouter>) {
  return mount(VApp, {
    slots: { default: () => h(HomeDrawer) },
    global: { plugins: [vuetify, router] },
  })
}

describe('HomeDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders "Dashboard" first, then a divider, then one item per installed app', async () => {
    const router = createTestRouter()
    router.push('/')
    await router.isReady()
    useAppsStore().apps = [
      { id: 'sample-app', displayName: 'Sample App' },
      { id: 'todo-list', displayName: 'To-Do List' },
    ]

    const wrapper = mountHomeDrawer(router)

    const items = wrapper.findAllComponents({ name: 'VListItem' })
    expect(items.map((item) => item.text())).toEqual(['Dashboard', 'Sample App', 'To-Do List'])
    expect(wrapper.findComponent({ name: 'VDivider' }).exists()).toBe(true)
  })

  it('links "Dashboard" to the dashboard route', async () => {
    const router = createTestRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mountHomeDrawer(router)

    const dashboardItem = wrapper.findAllComponents({ name: 'VListItem' }).find((item) => item.text() === 'Dashboard')
    expect(dashboardItem?.props('to')).toEqual({ name: 'dashboard' })
  })

  it('links each app item to its app-view route with the matching appId param', async () => {
    const router = createTestRouter()
    router.push('/')
    await router.isReady()
    useAppsStore().apps = [{ id: 'sample-app', displayName: 'Sample App' }]

    const wrapper = mountHomeDrawer(router)

    const appItem = wrapper.findAllComponents({ name: 'VListItem' }).find((item) => item.text() === 'Sample App')
    expect(appItem?.props('to')).toEqual({ name: 'app-view', params: { appId: 'sample-app' } })
  })

  it('loads the apps store on mount when the apps list is empty', async () => {
    const router = createTestRouter()
    router.push('/')
    await router.isReady()
    const appsStore = useAppsStore()
    appsStore.load = vi.fn()

    mountHomeDrawer(router)

    expect(appsStore.load).toHaveBeenCalledTimes(1)
  })

  it('navigates back to the dashboard route when "Dashboard" is clicked from an app-view route', async () => {
    const router = createTestRouter()
    useAppsStore().apps = [{ id: 'sample-app', displayName: 'Sample App' }]
    router.push('/apps/sample-app')
    await router.isReady()

    const wrapper = mountHomeDrawer(router)
    const dashboardLink = wrapper.findAll('a').find((link) => link.text() === 'Dashboard')
    await dashboardLink?.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})
