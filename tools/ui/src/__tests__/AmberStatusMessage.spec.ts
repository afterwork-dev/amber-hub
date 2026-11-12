import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberStatusMessage } from '../index'

const roles = [
  ['success', 'status'],
  ['info', 'status'],
  ['warning', 'alert'],
  ['error', 'alert'],
] as const

describe('AmberStatusMessage', () => {
  it.each(roles)('gives the %s variant role="%s"', (variant, role) => {
    const wrapper = mount(AmberStatusMessage, { props: { variant }, slots: { default: 'Saved' } })
    expect(wrapper.classes()).toContain('amber-status-message')
    expect(wrapper.classes()).toContain(`amber-status-message--${variant}`)
    expect(wrapper.attributes('role')).toBe(role)
    expect(wrapper.find('.amber-status-message__text').text()).toBe('Saved')
  })

  it('defaults to the info variant with role="status"', () => {
    const wrapper = mount(AmberStatusMessage)
    expect(wrapper.classes()).toContain('amber-status-message--info')
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('renders a 24px hidden status icon', () => {
    const icon = mount(AmberStatusMessage).find('svg')
    expect(icon.classes()).toContain('amber-status-message__icon')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.attributes('width')).toBe('24')
  })

  it('emits dismiss once when the dismiss button is clicked', async () => {
    const wrapper = mount(AmberStatusMessage, { props: { dismissible: true } })
    await wrapper.get('button[aria-label="Dismiss"]').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
    expect(wrapper.find('.amber-status-message__dismiss').attributes('type')).toBe('button')
  })

  it('has no dismiss button by default', () => {
    expect(mount(AmberStatusMessage).find('button').exists()).toBe(false)
  })

  it('uses a custom dismissLabel as the aria-label', () => {
    const wrapper = mount(AmberStatusMessage, {
      props: { dismissible: true, dismissLabel: 'Close message' },
    })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Close message')
  })
})
