import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AmberConfirmDialog } from '../index'

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
})
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
})

beforeEach(() => {
  showModal.mockClear()
  close.mockClear()
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = close
})

const props = { modelValue: true, title: 'Delete?', message: 'Sure?' }

describe('AmberConfirmDialog', () => {
  it('shows the message and Cancel before Confirm', () => {
    const wrapper = mount(AmberConfirmDialog, { props })
    expect(wrapper.get('.amber-dialog__title').text()).toBe('Delete?')
    expect(wrapper.get('.amber-dialog__body').text()).toBe('Sure?')
    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['Cancel', 'Confirm'])
    expect(buttons[0]?.classes()).toContain('amber-button--secondary')
    expect(buttons[1]?.classes()).toContain('amber-button--primary')
  })

  it('uses the danger variant and custom labels', () => {
    const wrapper = mount(AmberConfirmDialog, {
      props: { ...props, destructive: true, confirmLabel: 'Delete', cancelLabel: 'Keep' },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['Keep', 'Delete'])
    expect(buttons[1]?.classes()).toContain('amber-button--danger')
  })

  it('emits true then closes on Confirm', async () => {
    const wrapper = mount(AmberConfirmDialog, { props })
    await wrapper.findAll('button')[1]?.trigger('click')
    expect(wrapper.emitted('result')).toEqual([[true]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('emits false then closes on Cancel', async () => {
    const wrapper = mount(AmberConfirmDialog, { props })
    await wrapper.findAll('button')[0]?.trigger('click')
    expect(wrapper.emitted('result')).toEqual([[false]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('emits false once when Escape sends cancel and keydown', async () => {
    const wrapper = mount(AmberConfirmDialog, { props })
    await wrapper.get('dialog').trigger('cancel')
    await wrapper.get('dialog').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('result')).toEqual([[false]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
