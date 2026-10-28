import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import MonthEntryRow from '../MonthEntryRow.vue'

function mountRow(props: Record<string, unknown> = {}) {
  return mount(MonthEntryRow, {
    props: {
      index: 0,
      removable: true,
      name: 'Gold 5g',
      category: 'commodities',
      amount: '500',
      quantity: '3',
      ...props,
    },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

describe('MonthEntryRow', () => {
  it('shows what the quantity adds up to', () => {
    expect(mountRow().text()).toContain('= 1.500,00 €')
  })

  it('shows no total for a single unit or an unreadable amount', () => {
    expect(mountRow({ quantity: '1' }).text()).not.toContain('=')
    expect(mountRow({ amount: '-' }).text()).not.toContain('=')
  })

  it('switches an amount between asset and liability', async () => {
    const wrapper = mountRow({ amount: '500' })
    const toggle = wrapper.find('[aria-label="Switch between asset and liability"]')

    await toggle.trigger('click')
    expect(wrapper.emitted('update:amount')?.at(-1)).toEqual(['-500'])

    await wrapper.setProps({ amount: '-500' })
    await toggle.trigger('click')
    expect(wrapper.emitted('update:amount')?.at(-1)).toEqual(['500'])
  })

  it('removes itself by a button named after the entry', async () => {
    const wrapper = mountRow()

    await wrapper.find('[aria-label="Remove Gold 5g"]').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('names an unnamed entry by its position and can be kept from removal', () => {
    const wrapper = mountRow({ name: '', index: 2, removable: false })

    expect(wrapper.find('[aria-label="Remove entry 3"]').attributes('disabled')).toBeDefined()
  })
})
