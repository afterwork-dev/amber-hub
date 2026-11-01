import { describe, expect, it } from 'vitest'
import { groups, pages } from '../pages'

describe('page registry', () => {
  it('has unique paths', () => {
    const paths = pages.map((page) => page.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('orders the groups Foundations, Components, Layouts', () => {
    expect(groups).toEqual(['Foundations', 'Components', 'Layouts'])
  })

  it('lists the eight Foundations pages in order', () => {
    expect(pages.filter((page) => page.group === 'Foundations')).toEqual([
      { group: 'Foundations', title: 'Colour', path: '/foundations/colour' },
      { group: 'Foundations', title: 'Typography', path: '/foundations/typography' },
      { group: 'Foundations', title: 'Spacing & grid', path: '/foundations/spacing' },
      { group: 'Foundations', title: 'Radius', path: '/foundations/radius' },
      { group: 'Foundations', title: 'Elevation', path: '/foundations/elevation' },
      { group: 'Foundations', title: 'Focus', path: '/foundations/focus' },
      { group: 'Foundations', title: 'Motion', path: '/foundations/motion' },
      { group: 'Foundations', title: 'Icons', path: '/foundations/icons' },
    ])
  })

  it('has the Buttons and Text input & select Components pages and no Layouts pages yet', () => {
    expect(pages.filter((page) => page.group === 'Components')).toEqual([
      { group: 'Components', title: 'Buttons', path: '/components/buttons' },
      { group: 'Components', title: 'Text input & select', path: '/components/text-input' },
    ])
    expect(pages.filter((page) => page.group === 'Layouts')).toEqual([])
  })
})
