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

  it('links to the login route without submitting', async () => {
    const router = createTestRouter()
    await router.push('/register')
    await router.isReady()
    const wrapper = mount(RegisterForm, { global: { plugins: [vuetify, router] } })

    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/login')
    expect(link.text()).toBe('Already have an account? Log in')

    await link.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('login')
    expect(register).not.toHaveBeenCalled()
  })
})
