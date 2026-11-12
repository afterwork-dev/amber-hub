import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import { VApp } from 'vuetify/components'
import SettingsDrawer from '../SettingsDrawer.vue'
import { vuetify } from '../../../plugins/vuetify'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      {
        path: '/settings',
        component: RouterView,
        children: [
          { path: '', name: 'settings-api-key', component: { template: '<div />' } },
          { path: 'backups', name: 'settings-backups', component: { template: '<div />' } },
        ],
      },
    ],
  })
}

async function mountSettingsDrawer(path = '/settings') {
  const router = createTestRouter()
  router.push(path)
  await router.isReady()

  return mount(VApp, {
    slots: { default: () => h(SettingsDrawer) },
    global: { plugins: [vuetify, router] },
  })
}

function activeTitles(wrapper: Awaited<ReturnType<typeof mountSettingsDrawer>>) {
  return wrapper
    .findAllComponents({ name: 'VListItem' })
    .filter((item) => item.classes().includes('v-list-item--active'))
    .map((item) => item.text())
}

describe('SettingsDrawer', () => {
  it('renders a permanent navigation drawer', async () => {
    const wrapper = await mountSettingsDrawer()

    expect(wrapper.findComponent({ name: 'VNavigationDrawer' }).props('permanent')).toBe(true)
  })

  it('lists "API Key" and "Backups", linking to their settings pages', async () => {
    const wrapper = await mountSettingsDrawer()

    const items = wrapper.findAllComponents({ name: 'VListItem' })
    expect(items.map((item) => item.text())).toEqual(['API Key', 'Backups'])
    expect(items.map((item) => item.find('a').attributes('href'))).toEqual([
      '/settings',
      '/settings/backups',
    ])
  })

  it('shows only "API Key" as selected on the API key page', async () => {
    const wrapper = await mountSettingsDrawer('/settings')

    expect(activeTitles(wrapper)).toEqual(['API Key'])
  })

  it('shows only "Backups" as selected on the backups page', async () => {
    const wrapper = await mountSettingsDrawer('/settings/backups')

    expect(activeTitles(wrapper)).toEqual(['Backups'])
  })
})
