import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { AmberDialog } from '../index'

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

describe('AmberDialog', () => {
  it('opens with showModal and is labelled by its title', () => {
    const wrapper = mount(AmberDialog, { props: { modelValue: true, title: 'Rename' } })
    const dialog = wrapper.get('dialog')
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(dialog.classes()).toEqual(['amber-dialog'])
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    const title = wrapper.get('.amber-dialog__title')
    expect(dialog.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(title.text()).toBe('Rename')
  })

  it('renders the slots in the panel and none for empty ones', () => {
    const wrapper = mount(AmberDialog, {
      slots: { title: 'Slot title', default: 'Body', actions: 'Actions' },
    })
    expect(wrapper.get('.amber-dialog__panel .amber-dialog__title').text()).toBe('Slot title')
    expect(wrapper.get('.amber-dialog__body').text()).toBe('Body')
    expect(wrapper.get('.amber-dialog__actions').text()).toBe('Actions')
    const bare = mount(AmberDialog, { props: { title: 'T' } })
    expect(bare.find('.amber-dialog__body').exists()).toBe(false)
    expect(bare.find('.amber-dialog__actions').exists()).toBe(false)
  })

  it('opens and closes when modelValue changes', async () => {
    const wrapper = mount(AmberDialog, { props: { modelValue: false, title: 'T' } })
    expect(showModal).not.toHaveBeenCalled()
    await wrapper.setProps({ modelValue: true })
    expect(showModal).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ modelValue: false })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['cancel', () => new Event('cancel', { cancelable: true })],
    ['Escape keydown', () => new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })],
  ])('asks to close on %s', async (_name, create) => {
    const wrapper = mount(AmberDialog, { props: { modelValue: true, title: 'T' } })
    const event = create()
    wrapper.get('dialog').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it.each([
    ['cancel', () => new Event('cancel', { cancelable: true })],
    ['Escape keydown', () => new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })],
  ])('ignores %s when persistent but still prevents it', (_name, create) => {
    const wrapper = mount(AmberDialog, {
      props: { modelValue: true, title: 'T', persistent: true },
    })
    const event = create()
    wrapper.get('dialog').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes on a scrim click only', async () => {
    const wrapper = mount(AmberDialog, { props: { modelValue: true, title: 'T' } })
    await wrapper.get('.amber-dialog__panel').trigger('pointerdown')
    await wrapper.get('.amber-dialog__panel').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.get('dialog').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.get('dialog').trigger('pointerdown')
    await wrapper.get('dialog').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('ignores scrim clicks when persistent', async () => {
    const wrapper = mount(AmberDialog, {
      props: { modelValue: true, title: 'T', persistent: true },
    })
    await wrapper.get('dialog').trigger('pointerdown')
    await wrapper.get('dialog').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('emits false on a native close while still open', async () => {
    const wrapper = mount(AmberDialog, { props: { modelValue: true, title: 'T' } })
    await wrapper.get('dialog').trigger('close')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('returns focus to the element focused before opening', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const wrapper = mount(AmberDialog, {
      props: { modelValue: false, title: 'T' },
      attachTo: document.body,
    })
    await wrapper.setProps({ modelValue: true })
    trigger.blur()
    await wrapper.setProps({ modelValue: false })
    await nextTick()
    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
    trigger.remove()
  })

  it('closes when unmounted while open', () => {
    const wrapper = mount(AmberDialog, { props: { modelValue: true, title: 'T' } })
    wrapper.unmount()
    expect(close).toHaveBeenCalledTimes(1)
  })
})
