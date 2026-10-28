import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VApp } from 'vuetify/components'
import SettingsDrawer from '../SettingsDrawer.vue'
import { vuetify } from '../../../plugins/vuetify'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/settings', name: 'settings-api-key', component: { template: '<div />' } },
    ],
  })
}

async function mountSettingsDrawer() {
  const router = createTestRouter()
  router.push('/settings')
  await router.isReady()

  return mount(VApp, {
    slots: { default: () => h(SettingsDrawer) },
    global: { plugins: [vuetify, router] },
  })
}

describe('SettingsDrawer', () => {
  it('renders a permanent navigation drawer', async () => {
    const wrapper = await mountSettingsDrawer()

    expect(wrapper.findComponent({ name: 'VNavigationDrawer' }).props('permanent')).toBe(true)
  })

  it('lists exactly one entry, "API Key", linking to the settings page', async () => {
    const wrapper = await mountSettingsDrawer()

    const items = wrapper.findAllComponents({ name: 'VListItem' })
    expect(items).toHaveLength(1)
    expect(items[0]?.text()).toBe('API Key')
    expect(items[0]?.find('a').attributes('href')).toBe('/settings')
  })

  it('shows "API Key" as selected while the settings page is displayed', async () => {
    const wrapper = await mountSettingsDrawer()

    const item = wrapper.findComponent({ name: 'VListItem' })
    expect(item.classes()).toContain('v-list-item--active')
  })
})
