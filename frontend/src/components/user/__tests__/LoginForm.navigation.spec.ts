import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginForm from '../LoginForm.vue'
import { vuetify } from '../../../plugins/vuetify'

vi.mock('../../../services/userService', () => ({
  login: vi.fn(),
}))

import { login } from '../../../services/userService'

const stub = { render: () => null }

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: stub },
      { path: '/register', name: 'register', component: stub },
      { path: '/', name: 'dashboard', component: stub },
    ],
  })
}

describe('LoginForm navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('has a grey button to the register route without submitting', async () => {
    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()
    const wrapper = mount(LoginForm, { global: { plugins: [vuetify, router] } })

    const button = wrapper.findAllComponents({ name: 'VBtn' })[0]!
    expect(button.props('variant')).toBe('tonal')
    expect(button.props('color')).toBeUndefined()
    expect(button.element.tagName).toBe('A')
    expect(button.attributes('href')).toBe('/register')
    expect(button.text()).toBe('Create an account')

    await button.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('register')
    expect(login).not.toHaveBeenCalled()
  })
})
