import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import RegisterForm from '../RegisterForm.vue'
import { vuetify } from '../../../plugins/vuetify'

vi.mock('../../../services/userService', () => ({
  register: vi.fn(),
}))

import { register } from '../../../services/userService'

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

describe('RegisterForm navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('has a grey button to the login route without submitting', async () => {
    const router = createTestRouter()
    await router.push('/register')
    await router.isReady()
    const wrapper = mount(RegisterForm, { global: { plugins: [vuetify, router] } })

    const button = wrapper.findAllComponents({ name: 'VBtn' })[0]!
    expect(button.props('variant')).toBe('tonal')
    expect(button.props('color')).toBeUndefined()
    expect(button.element.tagName).toBe('A')
    expect(button.attributes('href')).toBe('/login')
    expect(button.text()).toBe('Log in instead')

    await button.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('login')
    expect(register).not.toHaveBeenCalled()
  })
})
