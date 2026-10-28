import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import RegisterPage from '../RegisterPage.vue'
import { vuetify } from '../../../plugins/vuetify'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
      { path: '/register', name: 'register', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a single card centered on the page', () => {
    const wrapper = mount(RegisterPage, { global: { plugins: [vuetify, createTestRouter()] } })

    const cards = wrapper.findAllComponents({ name: 'VCard' })
    expect(cards).toHaveLength(1)

    const container = wrapper.findComponent({ name: 'VContainer' })
    expect(container.classes()).toContain('justify-center')
    expect(container.classes()).toContain('align-center')
  })

  it('shows a "Register" card headline, then outlined inputs labeled per field in order', () => {
    const wrapper = mount(RegisterPage, { global: { plugins: [vuetify, createTestRouter()] } })

    const cardTitle = wrapper.findComponent({ name: 'VCardTitle' })
    expect(cardTitle.text()).toBe('Register')

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.map((field) => field.props('label'))).toEqual([
      'Username',
      'Password',
      'Confirm Password',
    ])
    for (const field of textFields) {
      expect(field.props('variant')).toBe('outlined')
    }
  })

  it('shows exactly one primary action: the Register button, positioned bottom-right of the card', () => {
    const wrapper = mount(RegisterPage, { global: { plugins: [vuetify, createTestRouter()] } })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.text()).toContain('Register')

    const buttonWrapper = buttons[0]?.element.closest('.d-flex')
    expect(buttonWrapper?.classList.contains('justify-end')).toBe(true)
  })
})
