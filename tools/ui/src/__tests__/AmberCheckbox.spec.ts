import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberCheckbox } from '../index'

describe('AmberCheckbox', () => {
  it('reflects modelValue and emits on toggle', async () => {
    const wrapper = mount(AmberCheckbox, { props: { modelValue: false, label: 'Agree' } })
    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('checkbox')
    expect(input.element.checked).toBe(false)
    await wrapper.setProps({ modelValue: true })
    expect(input.element.checked).toBe(true)
    await input.setValue(false)
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [true]])
  })

  it('is focusable and toggles on the activation click', () => {
    const wrapper = mount(AmberCheckbox, { props: { label: 'Agree' }, attachTo: document.body })
    const element = wrapper.find('input').element
    element.focus()
    expect(document.activeElement).toBe(element)
    expect(element.getAttribute('tabindex')).not.toBe('-1')
    // Real Space key presses are covered by the gallery e2e spec (selection-controls.spec.ts).
    element.click()
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    wrapper.unmount()
  })

  it('mirrors indeterminate on the DOM property', async () => {
    const wrapper = mount(AmberCheckbox, { props: { indeterminate: true, label: 'Agree' } })
    const input = wrapper.find('input')
    expect(input.element.indeterminate).toBe(true)
    await wrapper.setProps({ indeterminate: false })
    expect(input.element.indeterminate).toBe(false)
    await wrapper.setProps({ indeterminate: true })
    expect(input.element.indeterminate).toBe(true)
  })

  it('clears indeterminate on change and keeps the property in step with the prop', async () => {
    const wrapper = mount(AmberCheckbox, { props: { indeterminate: true, label: 'Agree' } })
    const input = wrapper.find('input')
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    expect(wrapper.emitted('update:indeterminate')).toEqual([[false]])
    expect(input.element.indeterminate).toBe(true)
    await wrapper.setProps({ indeterminate: false })
    expect(input.element.indeterminate).toBe(false)
  })

  it('does not emit update:indeterminate when not indeterminate', async () => {
    const wrapper = mount(AmberCheckbox, { props: { label: 'Agree' } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:indeterminate')).toBeUndefined()
  })

  it('renders the dash when indeterminate and the check when checked', async () => {
    const wrapper = mount(AmberCheckbox, { props: { modelValue: true, label: 'Agree' } })
    expect(wrapper.find('.lucide-check').exists()).toBe(true)
    expect(wrapper.find('.lucide-minus').exists()).toBe(false)
    await wrapper.setProps({ indeterminate: true })
    expect(wrapper.find('.lucide-minus').exists()).toBe(true)
    expect(wrapper.find('.lucide-check').exists()).toBe(false)
    await wrapper.setProps({ indeterminate: false, modelValue: false })
    expect(wrapper.find('.amber-checkbox__icon').exists()).toBe(false)
  })

  it('disables the input and marks the root', () => {
    const wrapper = mount(AmberCheckbox, { props: { disabled: true, label: 'Agree' } })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('amber-choice--disabled')
  })
})
