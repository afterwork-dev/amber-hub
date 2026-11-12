import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { AmberNavItem, AmberTopBar } from '../index'

describe('AmberTopBar', () => {
  it('renders the app name, the nav with its label and the end slot', () => {
    const wrapper = mount(AmberTopBar, {
      props: { appName: 'Treasury', navLabel: 'Areas' },
      slots: { default: '<a href="#">One</a>', end: '<button>Bell</button>' },
    })
    expect(wrapper.element.tagName).toBe('HEADER')
    expect(wrapper.classes()).toEqual(['amber-top-bar'])
    expect(wrapper.get('.amber-top-bar__name').text()).toBe('Treasury')
    expect(wrapper.get('.amber-app-mark').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Areas')
    expect(wrapper.get('.amber-top-bar__end').text()).toBe('Bell')
  })

  it('labels the nav "Sections" by default', () => {
    const wrapper = mount(AmberTopBar, {
      props: { appName: 'Treasury' },
      slots: { default: '<a href="#">One</a>' },
    })
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Sections')
  })

  it('marks only the active item with aria-current', () => {
    const wrapper = mount(AmberTopBar, {
      props: { appName: 'Treasury' },
      slots: {
        default: () => [
          h(AmberNavItem, { href: '#a' }, () => 'A'),
          h(AmberNavItem, { href: '#b', active: true }, () => 'B'),
          h(AmberNavItem, { href: '#c' }, () => 'C'),
        ],
      },
    })
    const current = wrapper.findAll('[aria-current]')
    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toBe('B')
    expect(current[0]?.attributes('aria-current')).toBe('page')
  })

  it('has no menu button outside a shell', () => {
    const wrapper = mount(AmberTopBar, { props: { appName: 'Treasury' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
