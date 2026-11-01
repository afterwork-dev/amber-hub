export type PageGroup = 'Foundations' | 'Components' | 'Layouts'

export interface GalleryPage {
  group: PageGroup
  title: string
  path: string
}

export const groups: readonly PageGroup[] = ['Foundations', 'Components', 'Layouts']

// The single list of gallery pages, in nav order. The router, the left nav and the smoke test
// all read from it.
export const pages: readonly GalleryPage[] = [
  { group: 'Foundations', title: 'Colour', path: '/foundations/colour' },
  { group: 'Foundations', title: 'Typography', path: '/foundations/typography' },
  { group: 'Foundations', title: 'Spacing & grid', path: '/foundations/spacing' },
  { group: 'Foundations', title: 'Radius', path: '/foundations/radius' },
  { group: 'Foundations', title: 'Elevation', path: '/foundations/elevation' },
  { group: 'Foundations', title: 'Focus', path: '/foundations/focus' },
  { group: 'Foundations', title: 'Motion', path: '/foundations/motion' },
  { group: 'Foundations', title: 'Icons', path: '/foundations/icons' },
  { group: 'Components', title: 'Buttons', path: '/components/buttons' },
  { group: 'Components', title: 'Text input & select', path: '/components/text-input' },
]
