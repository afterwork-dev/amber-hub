import { describe, it, expect, beforeEach } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { VApp } from 'vuetify/components'
import HomePage from '../HomePage.vue'
import DashboardPage from '../DashboardPage.vue'
import { vuetify } from '../../../plugins/vuetify'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: HomePage,
        children: [{ path: '', name: 'dashboard', component: DashboardPage }],
      },
    ],
  })
}

function mountHomePage(router: ReturnType<typeof createTestRouter>) {
  return mount(VApp, {
    slots: { default: () => h(RouterView) },
    global: { plugins: [vuetify, router] },
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the navigation bar, the permanent drawer, and the dashboard by default', async () => {
    const router = createTestRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mountHomePage(router)
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'VAppBar' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VNavigationDrawer' }).props('permanent')).toBe(true)
    expect(wrapper.findComponent(DashboardPage).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Greeting')
  })
})
