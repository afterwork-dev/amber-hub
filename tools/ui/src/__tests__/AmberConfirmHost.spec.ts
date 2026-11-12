import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { AmberConfirmHost, useConfirm, type AmberConfirmOptions } from '../index'

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

function mountHost() {
  let confirm!: ReturnType<typeof useConfirm>
  const Child = defineComponent({
    setup() {
      confirm = useConfirm()
      return () => h('p', 'child')
    },
  })
  const wrapper = mount(AmberConfirmHost, { slots: { default: () => h(Child) } })
  return { wrapper, confirm: (options: AmberConfirmOptions) => confirm(options) }
}

const buttonLabelled = (wrapper: ReturnType<typeof mountHost>['wrapper'], label: string) =>
  wrapper.findAll('button').find((button) => button.text() === label)

describe('AmberConfirmHost and useConfirm', () => {
  it('shows the request and resolves true on Confirm', async () => {
    const { wrapper, confirm } = mountHost()
    expect(wrapper.text()).toContain('child')
    const answer = confirm({ title: 'Archive?', message: 'Restore later.' })
    await nextTick()
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.amber-dialog__title').text()).toBe('Archive?')
    expect(wrapper.get('.amber-dialog__body').text()).toBe('Restore later.')
    await buttonLabelled(wrapper, 'Confirm')?.trigger('click')
    await expect(answer).resolves.toBe(true)
  })

  it('resolves false on Cancel and on Escape', async () => {
    const { wrapper, confirm } = mountHost()
    const cancelled = confirm({ title: 'A', message: 'a' })
    await nextTick()
    await buttonLabelled(wrapper, 'Cancel')?.trigger('click')
    await expect(cancelled).resolves.toBe(false)
    await nextTick()
    const escaped = confirm({ title: 'B', message: 'b' })
    await nextTick()
    await wrapper.get('dialog').trigger('cancel')
    await expect(escaped).resolves.toBe(false)
  })

  it('queues requests made back to back', async () => {
    const { wrapper, confirm } = mountHost()
    const order: string[] = []
    const first = confirm({ title: 'First', message: 'one' }).then((value) => {
      order.push(`first ${value}`)
    })
    const second = confirm({ title: 'Second', message: 'two' }).then((value) => {
      order.push(`second ${value}`)
    })
    await nextTick()
    expect(wrapper.get('.amber-dialog__title').text()).toBe('First')
    await buttonLabelled(wrapper, 'Confirm')?.trigger('click')
    await first
    await nextTick()
    await nextTick()
    expect(wrapper.get('.amber-dialog__title').text()).toBe('Second')
    expect(showModal).toHaveBeenCalledTimes(2)
    await buttonLabelled(wrapper, 'Cancel')?.trigger('click')
    await second
    expect(order).toEqual(['first true', 'second false'])
  })

  it('throws without a host', () => {
    const Lonely = defineComponent({
      setup() {
        useConfirm()
        return () => null
      },
    })
    expect(() => mount(Lonely)).toThrow(
      'useConfirm() needs an <AmberConfirmHost> above this component',
    )
  })
})
