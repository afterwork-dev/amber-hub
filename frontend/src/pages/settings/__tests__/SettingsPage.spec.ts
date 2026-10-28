import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { h } from 'vue'
import { VApp } from 'vuetify/components'
import SettingsPage from '../SettingsPage.vue'
import ApiKeyPage from '../ApiKeyPage.vue'
import { vuetify } from '../../../plugins/vuetify'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      {
        path: '/settings',
        component: SettingsPage,
        children: [{ path: '', name: 'settings-api-key', component: ApiKeyPage }],
      },
    ],
  })
}

async function mountSettingsPage() {
  const router = createTestRouter()
  router.push('/settings')
  await router.isReady()

  return mount(VApp, {
    slots: { default: () => h(RouterView) },
    global: { plugins: [vuetify, router] },
  })
}

describe('SettingsPage', () => {
  it('renders the settings navigation bar', async () => {
    const wrapper = await mountSettingsPage()

    expect(wrapper.findComponent({ name: 'VAppBar' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('Settings')
  })

  it('renders a permanent navigation drawer alongside the app bar', async () => {
    const wrapper = await mountSettingsPage()

    expect(wrapper.findComponent({ name: 'VNavigationDrawer' }).props('permanent')).toBe(true)
  })

  it('renders the selected settings section in the content area', async () => {
    const wrapper = await mountSettingsPage()

    expect(wrapper.findComponent({ name: 'VMain' }).text()).toContain('API Keys')
  })
})
