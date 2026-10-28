import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RegisterForm from '../RegisterForm.vue'
import { vuetify } from '../../../plugins/vuetify'
import { HttpClientError } from '../../../services/httpClient'

vi.mock('../../../services/userService', () => ({
  register: vi.fn(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

import { register } from '../../../services/userService'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountRegisterForm() {
  return mount(RegisterForm, { global: { plugins: [vuetify] } })
}

async function fillValidForm(wrapper: ReturnType<typeof mountRegisterForm>) {
  const [usernameInput, passwordInput, confirmInput] = wrapper.findAll('input')
  await usernameInput?.setValue('alice')
  await passwordInput?.setValue('correct-horse')
  await confirmInput?.setValue('correct-horse')
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('submits the entered values and redirects to home on success', async () => {
    vi.mocked(register).mockResolvedValue({
      username: 'alice',
      token: 'jwt-token',
      expiresIn: '15m',
      refreshToken: 'refresh-token',
      refreshExpiresIn: '7d',
    })

    const wrapper = mountRegisterForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(register).toHaveBeenCalledWith('alice', 'correct-horse')
    expect(push).toHaveBeenCalledWith({ name: 'dashboard' })
  })

  it('disables the Register button while the submission is in flight', async () => {
    vi.mocked(register).mockReturnValue(new Promise(() => {}))

    const wrapper = mountRegisterForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    const button = wrapper.findComponent({ name: 'VBtn' })
    expect(button.props('disabled')).toBe(true)
  })

  it('shows a friendly error message when registration fails for a non-conflict reason', async () => {
    vi.mocked(register).mockRejectedValue(new Error('An unexpected error occurred'))

    const wrapper = mountRegisterForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('An unexpected error occurred')
    expect(push).not.toHaveBeenCalled()
  })

  it('blocks submission and shows inline errors when required fields are empty', async () => {
    const wrapper = mountRegisterForm()
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    expect(register).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Username is required')
    expect(wrapper.text()).toContain('Password is required')
    expect(wrapper.text()).toContain('Password confirmation is required')
  })

  it('blocks submission and shows an inline error when passwords do not match', async () => {
    const wrapper = mountRegisterForm()
    const [usernameInput, passwordInput, confirmInput] = wrapper.findAll('input')
    await usernameInput?.setValue('alice')
    await passwordInput?.setValue('correct-horse')
    await confirmInput?.setValue('different-password')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    expect(register).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Passwords do not match')
  })

  it('renders a backend username-taken conflict as a field-specific error without clearing entered values', async () => {
    vi.mocked(register).mockRejectedValue(
      new HttpClientError('This username is already taken', 'USERNAME_TAKEN'),
    )

    const wrapper = mountRegisterForm()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('This username is already taken')
    expect(wrapper.find('[data-testid="form-error"]').exists()).toBe(false)

    const [usernameInput, passwordInput, confirmInput] = wrapper.findAll('input')
    expect((usernameInput?.element as HTMLInputElement).value).toBe('alice')
    expect((passwordInput?.element as HTMLInputElement).value).toBe('correct-horse')
    expect((confirmInput?.element as HTMLInputElement).value).toBe('correct-horse')
    expect(push).not.toHaveBeenCalled()
  })
})
