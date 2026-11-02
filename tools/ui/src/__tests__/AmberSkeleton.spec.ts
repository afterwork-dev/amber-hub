import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AmberSkeleton } from '../index'

describe('AmberSkeleton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is aria-busy', () => {
    expect(mount(AmberSkeleton).attributes('aria-busy')).toBe('true')
  })

  it('has a hidden "Loading" label, or a custom one', () => {
    expect(mount(AmberSkeleton).find('.amber-skeleton__label').text()).toBe('Loading')
    const custom = mount(AmberSkeleton, { props: { label: 'Loading plan' } })
    expect(custom.find('.amber-skeleton__label').text()).toBe('Loading plan')
  })

  it('wraps the slot in an aria-hidden shapes element', () => {
    const wrapper = mount(AmberSkeleton, {
      slots: { default: '<div class="amber-skeleton__line" />' },
    })
    const shapes = wrapper.get('.amber-skeleton__shapes')
    expect(shapes.attributes('aria-hidden')).toBe('true')
    expect(shapes.find('.amber-skeleton__line').exists()).toBe(true)
  })

  it('stays pending for 300ms', async () => {
    const wrapper = mount(AmberSkeleton)
    expect(wrapper.classes()).toContain('amber-skeleton--pending')
    vi.advanceTimersByTime(299)
    expect(wrapper.classes()).toContain('amber-skeleton--pending')
    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).not.toContain('amber-skeleton--pending')
  })
})
