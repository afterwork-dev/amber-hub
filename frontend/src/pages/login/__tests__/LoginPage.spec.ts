import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginPage from '../LoginPage.vue'
import { vuetify } from '../../../plugins/vuetify'

describe('LoginPage', () => {
  it('renders a single card centered on the page', () => {
    const wrapper = mount(LoginPage, { global: { plugins: [vuetify] } })

    const cards = wrapper.findAllComponents({ name: 'VCard' })
    expect(cards).toHaveLength(1)

    const container = wrapper.findComponent({ name: 'VContainer' })
    expect(container.classes()).toContain('justify-center')
    expect(container.classes()).toContain('align-center')
  })

  it('shows a "Login" card headline, then outlined inputs labeled per field in order', () => {
    const wrapper = mount(LoginPage, { global: { plugins: [vuetify] } })

    const cardTitle = wrapper.findComponent({ name: 'VCardTitle' })
    expect(cardTitle.text()).toBe('Login')

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.map((field) => field.props('label'))).toEqual(['Username', 'Password'])
    for (const field of textFields) {
      expect(field.props('variant')).toBe('outlined')
    }
  })

  it('shows the Login button bottom-right of the card with a secondary "Create an account" button to its left', () => {
    const wrapper = mount(LoginPage, { global: { plugins: [vuetify] } })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    expect(buttons).toHaveLength(2)
    expect(buttons[0]?.text()).toBe('Create an account')
    expect(buttons[1]?.text()).toContain('Login')

    const buttonWrapper = buttons[1]?.element.closest('.d-flex')
    expect(buttons[0]?.element.closest('.d-flex')).toBe(buttonWrapper)
    expect(buttonWrapper?.classList.contains('justify-end')).toBe(true)
  })
})
