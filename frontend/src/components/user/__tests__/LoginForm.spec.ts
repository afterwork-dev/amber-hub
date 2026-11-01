import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginForm from '../LoginForm.vue'
import { vuetify } from '../../../plugins/vuetify'
import { HttpClientError } from '../../../services/httpClient'

vi.mock('../../../services/userService', () => ({
  login: vi.fn(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

import { login } from '../../../services/userService'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountLoginForm() {
  return mount(LoginForm, { global: { plugins: [vuetify] } })
}

async function fillValidForm(wrapper: ReturnType<typeof mountLoginForm>) {
  const [usernameInput, passwordInput] = wrapper.findAll('input')
  await usernameInput?.setValue('alice')
  await passwordInput?.setValue('correct-horse')
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('submits the entered values, shows no error, and redirects to home on success', async () => {
    vi.mocked(login).mockResolvedValue({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })

    const wrapper = mountLoginForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(login).toHaveBeenCalledWith('alice', 'correct-horse')
    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('disables the Login button while the submission is in flight', async () => {
    vi.mocked(login).mockReturnValue(new Promise(() => {}))

    const wrapper = mountLoginForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    const button = wrapper
      .findAllComponents({ name: 'VBtn' })
      .find((b) => b.attributes('type') === 'submit')!
    expect(button.props('disabled')).toBe(true)
  })

  it('blocks submission and shows inline errors when required fields are empty', async () => {
    const wrapper = mountLoginForm()
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Username is required')
    expect(wrapper.text()).toContain('Password is required')
  })

  it('renders a generic message for invalid credentials without attributing it to a field', async () => {
    vi.mocked(login).mockRejectedValue(
      new HttpClientError('Invalid username or password', 'INVALID_CREDENTIALS'),
    )

    const wrapper = mountLoginForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Invalid username or password')

    const [usernameInput, passwordInput] = wrapper.findAll('input')
    expect((usernameInput?.element as HTMLInputElement).value).toBe('alice')
    expect((passwordInput?.element as HTMLInputElement).value).toBe('correct-horse')
    expect(push).not.toHaveBeenCalled()
  })
})
