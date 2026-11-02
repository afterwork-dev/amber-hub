import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberCard } from '../index'

describe('AmberCard', () => {
  it('renders the slots into the title, body and actions elements', () => {
    const wrapper = mount(AmberCard, {
      slots: { title: 'Title', default: 'Body', actions: 'Actions' },
    })
    expect(wrapper.classes()).toEqual(['amber-card'])
    expect(wrapper.get('.amber-card__title').text()).toBe('Title')
    expect(wrapper.get('.amber-card__body').text()).toBe('Body')
    expect(wrapper.get('.amber-card__actions').text()).toBe('Actions')
  })

  it('renders no element for an empty slot', () => {
    const wrapper = mount(AmberCard, { slots: { default: 'Body' } })
    expect(wrapper.find('.amber-card__title').exists()).toBe(false)
    expect(wrapper.find('.amber-card__actions').exists()).toBe(false)
    expect(mount(AmberCard).find('.amber-card__body').exists()).toBe(false)
  })

  it('adds amber-card--panel for panel', () => {
    expect(mount(AmberCard, { props: { panel: true } }).classes()).toContain('amber-card--panel')
  })
})
