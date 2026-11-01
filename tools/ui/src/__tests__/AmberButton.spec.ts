import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberButton } from '../index'
import { ArrowRight, Plus } from '../icons'

const variants = ['primary', 'secondary', 'ghost', 'danger'] as const

describe('AmberButton markup', () => {
  it.each(variants)('renders the %s variant classes', (variant) => {
    const wrapper = mount(AmberButton, { props: { variant } })
    expect(wrapper.classes()).toContain('amber-button')
    expect(wrapper.classes()).toContain(`amber-button--${variant}`)
  })

  it('defaults to a secondary md button element', () => {
    const wrapper = mount(AmberButton, { slots: { default: 'Save' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.classes()).toContain('amber-button--secondary')
    expect(wrapper.classes()).not.toContain('amber-button--sm')
    expect(wrapper.find('.amber-button__label').text()).toBe('Save')
  })

  it('adds the sm and on-raised classes', () => {
    const wrapper = mount(AmberButton, { props: { size: 'sm', surface: 'raised' } })
    expect(wrapper.classes()).toContain('amber-button--sm')
    expect(wrapper.classes()).toContain('amber-button--on-raised')
  })

  it('falls attributes and classes through to the root', () => {
    const wrapper = mount(AmberButton, { attrs: { 'data-x': '1', class: 'extra' } })
    expect(wrapper.attributes('data-x')).toBe('1')
    expect(wrapper.classes()).toContain('extra')
  })
})

describe('AmberButton as link', () => {
  it('renders an anchor with href', () => {
    const wrapper = mount(AmberButton, { props: { href: '/x' } })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('/x')
  })

  it('removes href and marks a disabled anchor', () => {
    const wrapper = mount(AmberButton, { props: { href: '/x', disabled: true } })
    expect(wrapper.attributes('href')).toBeUndefined()
    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('tabindex')).toBe('-1')
    expect(wrapper.classes()).toContain('amber-button--disabled')
  })
})

describe('AmberButton clicks', () => {
  it('emits click once with the event for an enabled button', async () => {
    const wrapper = mount(AmberButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent)
  })

  it('emits nothing for a disabled button and sets disabled', async () => {
    const wrapper = mount(AmberButton, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('emits nothing for a loading button', async () => {
    const wrapper = mount(AmberButton, { props: { loading: true } })
    expect(wrapper.attributes('disabled')).toBeUndefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it.each([{ disabled: true }, { loading: true }])(
    'emits nothing and prevents default for an anchor with %o',
    async (props) => {
      const wrapper = mount(AmberButton, { props: { href: '/x', ...props } })
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(wrapper.emitted('click')).toBeUndefined()
    },
  )

  it('does not prevent default on an enabled anchor', () => {
    const wrapper = mount(AmberButton, { props: { href: '/x' } })
    let prevented: boolean | undefined
    // Runs after the component's handler. Cancels the click so jsdom doesn't try to navigate.
    wrapper.element.addEventListener('click', (event: Event) => {
      prevented = event.defaultPrevented
      event.preventDefault()
    })
    wrapper.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(prevented).toBe(false)
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('AmberButton loading and icons', () => {
  it('shows a spinner and aria-busy while loading, keeping the label', () => {
    const wrapper = mount(AmberButton, { props: { loading: true }, slots: { default: 'Save' } })
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.classes()).toContain('amber-button--loading')
    expect(wrapper.find('.amber-button__spinner').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.amber-button__label').exists()).toBe(true)
  })

  it('has no spinner and no aria-busy when not loading', () => {
    const wrapper = mount(AmberButton)
    expect(wrapper.attributes('aria-busy')).toBeUndefined()
    expect(wrapper.find('.amber-button__spinner').exists()).toBe(false)
  })

  it('renders leading and trailing icons around the label', () => {
    const wrapper = mount(AmberButton, {
      props: { leadingIcon: Plus, trailingIcon: ArrowRight },
      slots: { default: 'Add' },
    })
    const children = [...wrapper.element.children]
    expect(children).toHaveLength(3)
    expect(children[0]?.classList.contains('amber-button__icon')).toBe(true)
    expect(children[1]?.classList.contains('amber-button__label')).toBe(true)
    expect(children[2]?.classList.contains('amber-button__icon')).toBe(true)
    expect(children[0]?.getAttribute('aria-hidden')).toBe('true')
    expect(children[0]?.getAttribute('width')).toBe('20')
  })

  it('draws sm icons at 16px', () => {
    const wrapper = mount(AmberButton, { props: { size: 'sm', leadingIcon: Plus } })
    expect(wrapper.find('.amber-button__icon').attributes('width')).toBe('16')
  })
})
