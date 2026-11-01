import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberSelect } from '../index'

const items = [
  { value: 1, label: 'One' },
  { value: 2, label: 'Two' },
  { value: 3, label: 'Three', disabled: true },
]

describe('AmberSelect', () => {
  it('renders one option per item', () => {
    const wrapper = mount(AmberSelect, { props: { items, label: 'Pick' } })
    const options = wrapper.findAll('option')
    expect(options.map((option) => option.text())).toEqual(['One', 'Two', 'Three'])
    expect(options.map((option) => option.attributes('disabled') !== undefined)).toEqual([
      false,
      false,
      true,
    ])
  })

  it('selects no option when nothing matches', () => {
    const wrapper = mount(AmberSelect, { props: { items, label: 'Pick' } })
    expect(wrapper.find('select').element.selectedIndex).toBe(-1)
  })

  it('syncs the selection with modelValue and keeps number values', async () => {
    const wrapper = mount(AmberSelect, { props: { items, modelValue: 1, label: 'Pick' } })
    const options = wrapper.findAll('option')
    expect(options[0]!.element.selected).toBe(true)
    await options[1]!.setValue()
    const emitted = wrapper.emitted('update:modelValue')!.at(-1)!
    expect(emitted).toEqual([2])
    expect(typeof emitted[0]).toBe('number')
    await wrapper.setProps({ modelValue: 2 })
    expect(options[1]!.element.selected).toBe(true)
  })

  it('links the label to a generated id, unique per instance', () => {
    const first = mount(AmberSelect, { props: { items, label: 'Email' } })
    const second = mount(AmberSelect, { props: { items, label: 'Email' } })
    const id = first.find('select').attributes('id')
    expect(id).toBeTruthy()
    expect(first.find('label').attributes('for')).toBe(id)
    expect(second.find('select').attributes('id')).not.toBe(id)
  })

  it('uses a given id', () => {
    const wrapper = mount(AmberSelect, { props: { items, label: 'Pick', id: 'x' } })
    expect(wrapper.find('select').attributes('id')).toBe('x')
    expect(wrapper.find('label').attributes('for')).toBe('x')
  })

  it('wires hint and error through aria-describedby and aria-invalid', () => {
    const props = { items, label: 'Pick', id: 'x' }
    const both = mount(AmberSelect, { props: { ...props, hint: 'A hint', error: 'Bad' } })
    expect(both.find('select').attributes('aria-describedby')).toBe('x-hint x-error')
    expect(both.find('#x-hint').text()).toBe('A hint')
    expect(both.find('#x-error').text()).toBe('Bad')
    expect(both.find('select').attributes('aria-invalid')).toBe('true')
    expect(both.classes()).toContain('amber-select--error')

    const error = mount(AmberSelect, { props: { ...props, error: 'Bad' } })
    expect(error.find('select').attributes('aria-describedby')).toBe('x-error')

    const hint = mount(AmberSelect, { props: { ...props, hint: 'A hint' } })
    expect(hint.find('select').attributes('aria-describedby')).toBe('x-hint')
    expect(hint.find('select').attributes('aria-invalid')).toBeUndefined()

    const none = mount(AmberSelect, { props })
    expect(none.find('select').attributes('aria-describedby')).toBeUndefined()
    expect(none.find('select').attributes('aria-invalid')).toBeUndefined()
  })

  it('disables the select and marks the root', () => {
    const wrapper = mount(AmberSelect, { props: { items, label: 'Pick', disabled: true } })
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('amber-select--disabled')
  })

  it('uses aria-label without a visible label', () => {
    const wrapper = mount(AmberSelect, { props: { items, ariaLabel: 'Search' } })
    expect(wrapper.find('label').exists()).toBe(false)
    expect(wrapper.find('select').attributes('aria-label')).toBe('Search')
  })

  it('always renders the chevron', () => {
    const wrapper = mount(AmberSelect, { props: { items, label: 'Pick' } })
    const chevron = wrapper.find('svg.amber-select__chevron')
    expect(chevron.attributes('aria-hidden')).toBe('true')
    expect(chevron.attributes('width')).toBe('20')
  })

  it('puts class on the root and other attributes on the select', () => {
    const wrapper = mount(AmberSelect, {
      props: { items, label: 'Pick' },
      attrs: { name: 'pick', class: 'extra' },
    })
    expect(wrapper.classes()).toContain('extra')
    expect(wrapper.find('select').classes()).not.toContain('extra')
    expect(wrapper.find('select').attributes('name')).toBe('pick')
  })
})
