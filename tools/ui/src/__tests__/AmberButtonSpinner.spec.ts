import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AmberButton, AmberSpinner } from '../index'

describe('AmberButton loading spinner', () => {
  it('renders an AmberSpinner with no delay and aria-hidden', () => {
    const wrapper = mount(AmberButton, { props: { loading: true } })
    const spinner = wrapper.getComponent(AmberSpinner)
    expect(spinner.props('delay')).toBe(false)
    expect(spinner.classes()).toContain('amber-button__spinner')
    expect(spinner.classes()).not.toContain('amber-spinner--pending')
    expect(spinner.attributes('aria-hidden')).toBe('true')
    expect(spinner.attributes('role')).toBe('progressbar')
    expect(spinner.attributes('aria-valuenow')).toBeUndefined()
  })

  it('renders no spinner when not loading', () => {
    expect(mount(AmberButton).findComponent(AmberSpinner).exists()).toBe(false)
  })

  it('uses the on-accent spinner for primary only', () => {
    const primary = mount(AmberButton, { props: { loading: true, variant: 'primary' } })
    expect(primary.get('.amber-spinner').classes()).toContain('amber-spinner--on-accent')
    const secondary = mount(AmberButton, { props: { loading: true } })
    expect(secondary.get('.amber-spinner').classes()).not.toContain('amber-spinner--on-accent')
  })

  it('uses 16px for sm and 20px by default', () => {
    const sm = mount(AmberButton, { props: { loading: true, size: 'sm' } })
    expect(sm.get('.amber-spinner').classes()).toContain('amber-spinner--16')
    const md = mount(AmberButton, { props: { loading: true } })
    expect(md.get('.amber-spinner').classes()).toContain('amber-spinner--20')
  })
})
