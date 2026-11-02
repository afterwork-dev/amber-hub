import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberBadge } from '../index'

describe('AmberBadge', () => {
  it('renders a span with the default classes and slot text', () => {
    const wrapper = mount(AmberBadge, { slots: { default: 'Active plan' } })
    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.classes()).toEqual(['amber-badge'])
    expect(wrapper.text()).toBe('Active plan')
  })

  it.each(['success', 'warning', 'error', 'info'] as const)(
    'adds amber-badge--%s for that status',
    (status) => {
      expect(mount(AmberBadge, { props: { status } }).classes()).toContain(`amber-badge--${status}`)
    },
  )
})
