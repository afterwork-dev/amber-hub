import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VApp } from 'vuetify/components'
import SettingsBar from '../SettingsBar.vue'
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

async function mountSettingsBar() {
  const router = createTestRouter()
  router.push('/settings')
  await router.isReady()

  return mount(VApp, {
    slots: { default: () => h(SettingsBar) },
    global: { plugins: [vuetify, router] },
  })
}

describe('SettingsBar', () => {
  it('renders an app bar titled "Settings"', async () => {
    const wrapper = await mountSettingsBar()

    expect(wrapper.findComponent({ name: 'VAppBar' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('Settings')
  })

  it('renders a back control pointing at the home page', async () => {
    const wrapper = await mountSettingsBar()

    const back = wrapper.find('[aria-label="Back"]')
    expect(back.exists()).toBe(true)
    expect(back.attributes('href')).toBe('/')
  })

  it('does not render the user menu', async () => {
    const wrapper = await mountSettingsBar()

    expect(wrapper.text()).not.toContain('Hello,')
    expect(wrapper.findComponent({ name: 'VMenu' }).exists()).toBe(false)
  })
})
