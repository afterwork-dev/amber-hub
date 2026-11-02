import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AmberSpinner } from '../index'

describe('AmberSpinner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to size 20 with a progressbar role and no aria-valuenow', () => {
    const wrapper = mount(AmberSpinner)
    expect(wrapper.classes()).toContain('amber-spinner--20')
    expect(wrapper.attributes('role')).toBe('progressbar')
    expect(wrapper.attributes('aria-label')).toBe('Loading')
    expect(wrapper.attributes('aria-valuenow')).toBeUndefined()
  })

  it('adds the size and on-accent classes', () => {
    const wrapper = mount(AmberSpinner, { props: { size: 32, onAccent: true } })
    expect(wrapper.classes()).toContain('amber-spinner--32')
    expect(wrapper.classes()).toContain('amber-spinner--on-accent')
    expect(mount(AmberSpinner, { props: { size: 16 } }).classes()).toContain('amber-spinner--16')
  })

  it('uses a custom label', () => {
    expect(mount(AmberSpinner, { props: { label: 'Saving' } }).attributes('aria-label')).toBe(
      'Saving',
    )
  })

  it('stays pending for 300ms', () => {
    const wrapper = mount(AmberSpinner)
    expect(wrapper.classes()).toContain('amber-spinner--pending')
    vi.advanceTimersByTime(299)
    expect(wrapper.classes()).toContain('amber-spinner--pending')
    vi.advanceTimersByTime(1)
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.classes()).not.toContain('amber-spinner--pending')
    })
  })

  it('is not pending with delay false', () => {
    const wrapper = mount(AmberSpinner, { props: { delay: false } })
    expect(wrapper.classes()).not.toContain('amber-spinner--pending')
  })

  it('clears the timer on unmount', () => {
    const wrapper = mount(AmberSpinner)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
  })
})
