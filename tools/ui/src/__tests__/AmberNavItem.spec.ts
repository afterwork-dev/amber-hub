import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { AmberNavItem } from '../index'

// Stands in for a router link: it sets its own aria-current, which the item must override.
const LinkStub = defineComponent({
  props: { to: { type: [String, Object], default: undefined } },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'a',
        { 'data-to': JSON.stringify(props.to), 'aria-current': 'false', ...attrs },
        slots.default?.(),
      )
  },
})

describe('AmberNavItem', () => {
  it('renders an <a> with the href from href or a string to', () => {
    const byHref = mount(AmberNavItem, { props: { href: '/a' }, slots: { default: 'Label' } })
    expect(byHref.element.tagName).toBe('A')
    expect(byHref.classes()).toEqual(['amber-nav-item'])
    expect(byHref.attributes('href')).toBe('/a')
    expect(byHref.text()).toBe('Label')
    expect(mount(AmberNavItem, { props: { to: '/b' } }).attributes('href')).toBe('/b')
    expect(mount(AmberNavItem, { props: { to: '/b', href: '/c' } }).attributes('href')).toBe('/c')
    expect(
      mount(AmberNavItem, { props: { to: { path: '/b' } } }).attributes('href'),
    ).toBeUndefined()
  })

  it('has aria-current and the modifier class only when active', () => {
    const idle = mount(AmberNavItem, { props: { href: '#' } })
    expect(idle.attributes('aria-current')).toBeUndefined()
    expect(idle.classes()).not.toContain('amber-nav-item--active')
    const active = mount(AmberNavItem, { props: { href: '#', active: true } })
    expect(active.attributes('aria-current')).toBe('page')
    expect(active.classes()).toContain('amber-nav-item--active')
  })

  it('renders the as component with to, and aria-current follows active', () => {
    const to = { path: '/x' }
    const idle = mount(AmberNavItem, { props: { as: LinkStub, to }, slots: { default: 'Go' } })
    expect(idle.attributes('data-to')).toBe(JSON.stringify(to))
    expect(idle.classes()).toContain('amber-nav-item')
    expect(idle.attributes('aria-current')).toBeUndefined()
    const active = mount(AmberNavItem, { props: { as: LinkStub, to, active: true } })
    expect(active.attributes('aria-current')).toBe('page')
    expect(active.classes()).toContain('amber-nav-item--active')
  })
})
