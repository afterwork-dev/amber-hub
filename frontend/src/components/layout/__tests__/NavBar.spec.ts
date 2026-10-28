import { describe, it, expect, beforeEach, vi } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { VApp } from 'vuetify/components'
import NavBar from '../NavBar.vue'
import { useAuthStore } from '../../../stores/authStore'

const logout = vi.fn()
vi.mock('../../../composables/useLogout', () => ({
  useLogout: () => ({ logout }),
}))

const testVuetify = createVuetify({
  defaults: {
    VOverlay: { transition: false },
    VMenu: { transition: false },
  },
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      {
        path: '/settings',
        component: { template: '<router-view />' },
        children: [
          { path: '', name: 'settings-api-key', component: { template: '<div />' } },
        ],
      },
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
    ],
  })
}

async function mountNavBar() {
  const router = createTestRouter()
  router.push('/')
  await router.isReady()

  return mount(VApp, {
    slots: { default: () => h(NavBar) },
    global: { plugins: [testVuetify, router] },
    attachTo: document.body,
  })
}

function signIn(): void {
  useAuthStore().setSession({
    username: 'alice',
    token: 'jwt-token',
    expiresIn: '15m',
    refreshToken: 'refresh-token',
    refreshExpiresIn: '7d',
  })
}

async function openMenu(wrapper: Awaited<ReturnType<typeof mountNavBar>>) {
  await wrapper.findComponent({ name: 'VBtn' }).trigger('click')
  await wrapper.vm.$nextTick()
  return wrapper.findAllComponents({ name: 'VListItem' })
}

describe('NavBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    logout.mockClear()
  })

  it('renders an app bar with the greeting for the logged-in username', async () => {
    signIn()

    const wrapper = await mountNavBar()

    expect(wrapper.findComponent({ name: 'VAppBar' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('Hello, alice')
  })

  it('renders a generic round user icon', async () => {
    signIn()

    const wrapper = await mountNavBar()

    expect(wrapper.findComponent({ name: 'VBtn' }).props('prependIcon')).toBe('mdi-account')
  })

  it('opens a dropdown with "Settings" above "Logout" when the button is clicked', async () => {
    signIn()

    const items = await openMenu(await mountNavBar())

    expect(items.map((item) => item.text())).toEqual(['Settings', 'Logout'])
  })

  it('links "Settings" to the settings page', async () => {
    signIn()

    const items = await openMenu(await mountNavBar())
    const settingsItem = items.find((item) => item.text() === 'Settings')

    expect(settingsItem?.find('a').attributes('href')).toBe('/settings')
  })

  it('closes the dropdown when clicking outside of it', async () => {
    signIn()

    const wrapper = await mountNavBar()
    const button = wrapper.findComponent({ name: 'VBtn' })
    await button.trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.v-overlay--active')).not.toBeNull()

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.v-overlay--active')).toBeNull()
  })

  it('calls logout when "Logout" is clicked', async () => {
    signIn()

    const items = await openMenu(await mountNavBar())
    const logoutItem = items.find((item) => item.text() === 'Logout')
    await logoutItem?.trigger('click')

    expect(logout).toHaveBeenCalled()
  })
})
