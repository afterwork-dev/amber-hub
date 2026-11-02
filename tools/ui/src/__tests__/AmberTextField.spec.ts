import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberTextField } from '../index'
import { Search } from '../icons'

describe('AmberTextField', () => {
  it('syncs the input value with modelValue', async () => {
    const wrapper = mount(AmberTextField, { props: { modelValue: 'a', label: 'Name' } })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('a')
    await wrapper.setProps({ modelValue: 'b' })
    expect(input.element.value).toBe('b')
    await input.setValue('c')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c'])
  })

  it('links the label to a generated id, unique per instance', () => {
    const first = mount(AmberTextField, { props: { label: 'Email' } })
    const second = mount(AmberTextField, { props: { label: 'Email' } })
    const id = first.find('input').attributes('id')
    expect(id).toBeTruthy()
    expect(first.find('label').attributes('for')).toBe(id)
    expect(second.find('input').attributes('id')).not.toBe(id)
  })

  it('uses a given id', () => {
    const wrapper = mount(AmberTextField, { props: { label: 'Email', id: 'x' } })
    expect(wrapper.find('input').attributes('id')).toBe('x')
    expect(wrapper.find('label').attributes('for')).toBe('x')
  })

  it('wires hint and error through aria-describedby and aria-invalid', () => {
    const props = { label: 'Email', id: 'x' }
    const both = mount(AmberTextField, { props: { ...props, hint: 'A hint', error: 'Bad' } })
    expect(both.find('input').attributes('aria-describedby')).toBe('x-hint x-error')
    expect(both.find('#x-hint').text()).toBe('A hint')
    expect(both.find('#x-error').text()).toBe('Bad')
    expect(both.find('input').attributes('aria-invalid')).toBe('true')
    expect(both.classes()).toContain('amber-text-field--error')

    const error = mount(AmberTextField, { props: { ...props, error: 'Bad' } })
    expect(error.find('input').attributes('aria-describedby')).toBe('x-error')

    const hint = mount(AmberTextField, { props: { ...props, hint: 'A hint' } })
    expect(hint.find('input').attributes('aria-describedby')).toBe('x-hint')
    expect(hint.find('input').attributes('aria-invalid')).toBeUndefined()

    const none = mount(AmberTextField, { props })
    expect(none.find('input').attributes('aria-describedby')).toBeUndefined()
    expect(none.find('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('emits the typed string for number and date types', async () => {
    const number = mount(AmberTextField, { props: { label: 'Amount', type: 'number' } })
    await number.find('input').setValue('42')
    expect(number.emitted('update:modelValue')?.at(-1)).toEqual(['42'])

    const date = mount(AmberTextField, { props: { label: 'Day', type: 'date' } })
    await date.find('input').setValue('2026-01-31')
    expect(date.emitted('update:modelValue')?.at(-1)).toEqual(['2026-01-31'])
  })

  it('treats an empty error as no error', () => {
    const wrapper = mount(AmberTextField, { props: { label: 'Email', id: 'x', error: '' } })
    expect(wrapper.find('#x-error').exists()).toBe(false)
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.classes()).not.toContain('amber-text-field--error')
  })

  it('disables the input and marks the root', () => {
    const wrapper = mount(AmberTextField, { props: { label: 'Name', disabled: true } })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('amber-text-field--disabled')
  })

  it('uses aria-label without a visible label', () => {
    const wrapper = mount(AmberTextField, { props: { ariaLabel: 'Search' } })
    expect(wrapper.find('label').exists()).toBe(false)
    expect(wrapper.find('input').attributes('aria-label')).toBe('Search')
  })

  it('renders the type and a leading icon', () => {
    const wrapper = mount(AmberTextField, {
      props: { label: 'Secret', type: 'password', leadingIcon: Search },
    })
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    const icon = wrapper.find('svg.amber-text-field__icon')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.attributes('width')).toBe('20')
  })

  it('puts class on the root and other attributes on the input', () => {
    const wrapper = mount(AmberTextField, {
      props: { label: 'Email' },
      attrs: { name: 'email', class: 'extra' },
    })
    expect(wrapper.classes()).toContain('extra')
    expect(wrapper.find('input').classes()).not.toContain('extra')
    expect(wrapper.find('input').attributes('name')).toBe('email')
  })
})
