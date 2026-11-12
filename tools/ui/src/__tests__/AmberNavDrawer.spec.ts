import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { AmberAccountSwitcher, AmberNavDrawer, AmberNavItem, AmberNavSection } from '../index'

describe('AmberNavDrawer', () => {
  it('renders the header, the sections and the account slot', () => {
    const wrapper = mount(AmberNavDrawer, {
      props: { appName: 'Treasury' },
      slots: {
        default: () =>
          h(AmberNavSection, { label: 'Layouts' }, () =>
            h(AmberNavItem, { href: '#' }, () => 'One'),
          ),
        account: () => h(AmberAccountSwitcher, { name: 'Ada Lovelace' }),
      },
    })
    expect(wrapper.element.tagName).toBe('NAV')
    expect(wrapper.classes()).toEqual(['amber-nav-drawer'])
    expect(wrapper.attributes('aria-label')).toBe('Main')
    expect(wrapper.get('.amber-nav-drawer__header').text()).toBe('Treasury')
    const group = wrapper.get('[role="group"]')
    const label = wrapper.get('.amber-nav-section__label')
    expect(group.attributes('aria-labelledby')).toBe(label.attributes('id'))
    expect(label.text()).toBe('Layouts')
    expect(wrapper.get('.amber-nav-drawer__account').find('button').exists()).toBe(true)
  })

  it('renders the account wrapper only with the account slot', () => {
    const wrapper = mount(AmberNavDrawer, { props: { appName: 'Treasury', label: 'Menu' } })
    expect(wrapper.attributes('aria-label')).toBe('Menu')
    expect(wrapper.find('.amber-nav-drawer__account').exists()).toBe(false)
  })

  it('gives each section its own label id', () => {
    const wrapper = mount(AmberNavDrawer, {
      props: { appName: 'Treasury' },
      slots: {
        default: () => [h(AmberNavSection, { label: 'One' }), h(AmberNavSection, { label: 'Two' })],
      },
    })
    const ids = wrapper.findAll('.amber-nav-section').map((s) => s.attributes('aria-labelledby'))
    expect(new Set(ids).size).toBe(2)
  })

  it('marks only the active item with aria-current', () => {
    const wrapper = mount(AmberNavDrawer, {
      props: { appName: 'Treasury' },
      slots: {
        default: () =>
          h(AmberNavSection, { label: 'S' }, () => [
            h(AmberNavItem, { href: '#a' }, () => 'A'),
            h(AmberNavItem, { href: '#b', active: true }, () => 'B'),
          ]),
      },
    })
    const current = wrapper.findAll('[aria-current]')
    expect(current).toHaveLength(1)
    expect(current[0]?.text()).toBe('B')
  })
})

describe('AmberAccountSwitcher', () => {
  it('shows the initials of the first two words and the name, and emits click', async () => {
    const wrapper = mount(AmberAccountSwitcher, { props: { name: 'ada king lovelace' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.get('.amber-account-switcher__avatar').text()).toBe('AK')
    expect(wrapper.get('.amber-account-switcher__avatar').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.amber-account-switcher__name').text()).toBe('ada king lovelace')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('uses one initial for a one-word name', () => {
    const wrapper = mount(AmberAccountSwitcher, { props: { name: 'ada' } })
    expect(wrapper.get('.amber-account-switcher__avatar').text()).toBe('A')
  })
})
