import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberEmptyState } from '../index'
import { Inbox } from '../icons'

describe('AmberEmptyState', () => {
  it('renders the icon, title and description', () => {
    const wrapper = mount(AmberEmptyState, {
      props: { icon: Inbox, title: 'No entries yet', description: 'Add your first entry.' },
    })
    const icon = wrapper.get('.amber-empty-state__icon')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.attributes('width')).toBe('40')
    expect(wrapper.get('.amber-empty-state__title').text()).toBe('No entries yet')
    expect(wrapper.get('.amber-empty-state__description').text()).toBe('Add your first entry.')
  })

  it('renders no description or action element when not given', () => {
    const wrapper = mount(AmberEmptyState, { props: { icon: Inbox, title: 'Empty' } })
    expect(wrapper.find('.amber-empty-state__description').exists()).toBe(false)
    expect(wrapper.find('.amber-empty-state__action').exists()).toBe(false)
  })

  it('renders the action slot', () => {
    const wrapper = mount(AmberEmptyState, {
      props: { icon: Inbox, title: 'Empty' },
      slots: { action: '<button>Add entry</button>' },
    })
    expect(wrapper.get('.amber-empty-state__action').text()).toBe('Add entry')
  })
})
