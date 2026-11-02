import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberSwitch } from '../index'

describe('AmberSwitch', () => {
  it('reflects modelValue in checked and aria-checked', async () => {
    const wrapper = mount(AmberSwitch, { props: { modelValue: false, label: 'Wifi' } })
    const input = wrapper.find('input')
    expect(input.attributes('role')).toBe('switch')
    expect(input.attributes('type')).toBe('checkbox')
    expect(input.element.checked).toBe(false)
    expect(input.attributes('aria-checked')).toBe('false')
    await wrapper.setProps({ modelValue: true })
    expect(input.element.checked).toBe(true)
    expect(input.attributes('aria-checked')).toBe('true')
    await wrapper.setProps({ modelValue: false })
    expect(input.element.checked).toBe(false)
    expect(input.attributes('aria-checked')).toBe('false')
  })

  it('emits update:modelValue when toggled', async () => {
    const wrapper = mount(AmberSwitch, { props: { label: 'Wifi' } })
    await wrapper.find('input').setValue(true)
    await wrapper.find('input').setValue(false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true], [false]])
  })

  it('is focusable and toggles on the activation click', async () => {
    const wrapper = mount(AmberSwitch, { props: { label: 'Wifi' }, attachTo: document.body })
    const element = wrapper.find('input').element
    element.focus()
    expect(document.activeElement).toBe(element)
    expect(element.getAttribute('tabindex')).not.toBe('-1')
    // Real Space key presses are covered by the gallery e2e spec (selection-controls.spec.ts).
    element.click()
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    wrapper.unmount()
  })

  it('disables the input and marks the root', () => {
    const wrapper = mount(AmberSwitch, { props: { disabled: true, label: 'Wifi' } })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('amber-choice--disabled')
  })

  it('renders the label, or the aria-label alone', () => {
    const labelled = mount(AmberSwitch, { props: { label: 'Wifi' } })
    expect(labelled.find('.amber-choice__label').text()).toBe('Wifi')
    const bare = mount(AmberSwitch, { props: { ariaLabel: 'Wifi' } })
    expect(bare.find('.amber-choice__label').exists()).toBe(false)
    expect(bare.find('input').attributes('aria-label')).toBe('Wifi')
  })

  it('puts class on the root and other attributes on the input', () => {
    const wrapper = mount(AmberSwitch, {
      props: { label: 'Wifi' },
      attrs: { class: 'extra', name: 'wifi' },
    })
    expect(wrapper.element.tagName).toBe('LABEL')
    expect(wrapper.classes()).toContain('extra')
    expect(wrapper.find('input').attributes('name')).toBe('wifi')
    expect(wrapper.find('input').classes()).not.toContain('extra')
  })
})
