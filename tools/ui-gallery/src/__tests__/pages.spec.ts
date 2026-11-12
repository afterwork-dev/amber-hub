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

  it('has the Buttons, Text input & select, Switch, checkbox & radio and Card, badge & feedback and Dialog and Top bar & drawer Components pages and the App shell, Dashboard and Form Layouts pages', () => {
    expect(pages.filter((page) => page.group === 'Components')).toEqual([
      { group: 'Components', title: 'Buttons', path: '/components/buttons' },
      { group: 'Components', title: 'Text input & select', path: '/components/text-input' },
      { group: 'Components', title: 'Switch, checkbox & radio', path: '/components/selection' },
      { group: 'Components', title: 'Card, badge & feedback', path: '/components/card-feedback' },
      { group: 'Components', title: 'Dialog', path: '/components/dialog' },
      { group: 'Components', title: 'Top bar & drawer', path: '/components/navigation' },
    ])
    expect(pages.filter((page) => page.group === 'Layouts')).toEqual([
      { group: 'Layouts', title: 'App shell', path: '/layouts/app-shell' },
      { group: 'Layouts', title: 'Dashboard', path: '/layouts/dashboard' },
      { group: 'Layouts', title: 'Form', path: '/layouts/form' },
    ])
  })
})
