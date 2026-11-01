import { tokens, type TokenName } from '@amber-hub/ui/tokens'

// Everything the foundation pages show. Values come from `tokens` by name; usage text is copied
// from docs/amberui.md with markdown and the [measured]/[derived] markers removed.

export interface TokenItem {
  token: TokenName
  value: string
  usage?: string
}

export interface Spec {
  label: string
  value: string
  token?: TokenName
  derived?: boolean
}

function item(token: TokenName, usage?: string): TokenItem {
  return { token, value: tokens[token], usage }
}

function spec(label: string, token: TokenName): Spec {
  return { label, value: tokens[token], token }
}

function px(value: string): number {
  return Number.parseFloat(value)
}

// Doc values that are not tokens.

// docs/amberui.md 2.4: the overline's letter-spacing, marked [derived].
export const OVERLINE_LETTER_SPACING = '0.12em'

// docs/amberui.md 2.5: "The grid has 12 columns with a 24px gutter."
export const GRID_COLUMNS = 12
export const GRID_GUTTER = tokens['space-6']

// docs/amberui.md 2.5: tablet from 768px, desktop from 1280px, and an 80px desktop margin.
export const TABLET_MIN_WIDTH = 768
export const DESKTOP_MIN_WIDTH = 1280
export const DESKTOP_MARGIN = 80

// docs/amberui.md 2.7: the surface step each elevation level sits on.
export const ELEVATION_SURFACES = {
  'elevation-0': 'canvas',
  'elevation-1': 'card',
  'elevation-2': 'raised',
  'elevation-3': 'raised',
} as const satisfies Record<string, TokenName>

export const colour = {
  notes: [
    'Use the accent for primary buttons and calls to action, and for active, selected and focus states. Use it sparingly, and never as a large surface fill.',
    "These are the only hues besides orange. They're reserved for feedback and never used for surfaces or branding.",
  ],
  groups: [
    {
      title: 'Gray',
      items: [
        item('canvas', 'page background (E0)'),
        item('base', 'content panels on the canvas'),
        item('card', 'cards, inputs, top bar, drawer (E1)'),
        item('raised', 'raised controls, dialogs, hairlines (E2/E3)'),
        item('border', 'control borders, unchecked toggles'),
        item('text-muted', 'disabled text, placeholders, section labels'),
        item('text-secondary', 'body copy, inactive navigation'),
        item('text-primary', 'headings, values, active text'),
      ],
    },
    {
      title: 'Accent',
      items: [
        item('accent-600', 'pressed state of accent controls'),
        item('accent-500', 'the accent: primary buttons, checked toggles, focus'),
        item('accent-400', 'accent text on tinted fills; hover of accent controls'),
        item('accent-300', 'rare highlights'),
        item('on-accent', 'text and icons on accent-500'),
      ],
    },
    {
      title: 'Tint',
      items: [item('accent-tint', '"selected" fill: active nav item, badges')],
    },
    {
      title: 'Status',
      items: [
        item('success', 'confirmations, completed states'),
        item('warning', 'caution, approaching limits'),
        item('error', 'failures, destructive actions'),
        item('info', 'neutral, non-urgent messages'),
      ],
    },
  ],
}

export type TypeStyleName = 'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'overline'

export interface TypeStyle {
  name: TypeStyleName
  usage: string
  specs: Spec[]
  uppercase?: boolean
  letterSpacing?: string
}

function typeStyle(name: TypeStyleName, usage: string): TypeStyle {
  return {
    name,
    usage,
    specs: [
      spec('size', `type-${name}-size`),
      spec('weight', `type-${name}-weight`),
      spec('line height', `type-${name}-line-height`),
    ],
  }
}

const overline = typeStyle(
  'overline',
  `section labels: uppercase, letter-spacing: ${OVERLINE_LETTER_SPACING}`,
)
overline.uppercase = true
overline.letterSpacing = OVERLINE_LETTER_SPACING
overline.specs.push({ label: 'letter-spacing', value: OVERLINE_LETTER_SPACING, derived: true })

export const typography = {
  notes: [
    'The only family is Inter, self-hosted. Never load it from a third-party CDN.',
    'Buttons and nav items use body size at weight 600.',
  ],
  styles: [
    typeStyle('display', 'page hero, one per screen at most'),
    typeStyle('heading', 'page titles'),
    typeStyle('subheading', 'section and card titles'),
    typeStyle('body', 'descriptions, table cells, body copy'),
    typeStyle('caption', 'timestamps, labels, metadata'),
    overline,
  ],
}

export interface GridMargin {
  device: string
  breakpoint: string
  margin: number
}

export const gridMargins: GridMargin[] = [
  { device: 'Phone', breakpoint: `<${TABLET_MIN_WIDTH}px`, margin: px(tokens['space-4']) },
  {
    device: 'Tablet',
    breakpoint: `${TABLET_MIN_WIDTH}–${DESKTOP_MIN_WIDTH - 1}px`,
    margin: px(tokens['space-8']),
  },
  { device: 'Desktop', breakpoint: `≥${DESKTOP_MIN_WIDTH}px`, margin: DESKTOP_MARGIN },
]

/** The page margin, in px, for a frame of the given width (docs/amberui.md 2.5). */
export function gridMargin(width: number): number {
  const [phone, tablet, desktop] = gridMargins as [GridMargin, GridMargin, GridMargin]
  if (width >= DESKTOP_MIN_WIDTH) return desktop.margin
  if (width >= TABLET_MIN_WIDTH) return tablet.margin
  return phone.margin
}

export const spacing = {
  notes: [
    `There is a ${tokens['space-1']} base scale. Use only these values for padding, gaps and margins.`,
  ],
  scale: [
    item('space-1'),
    item('space-2'),
    item('space-4'),
    item('space-6'),
    item('space-8'),
    item('space-12'),
  ],
}

export const radius = {
  notes: [
    "Radius scales with control size. The checkbox (20px) uses 6px; that's the only exception.",
  ],
  items: [
    item('radius-sm', 'small controls: checkbox (6px, see below), nav items, chips'),
    item('radius-md', 'inputs, selects'),
    item('radius-lg', 'cards, panels'),
    item('radius-xl', 'large panels, top bar, drawer, dialogs'),
    item('radius-2xl', 'hero tiles, app icons'),
    item('radius-full', 'buttons, pills, avatars, switches, radios'),
  ],
}

function elevationItem(token: keyof typeof ELEVATION_SURFACES, usage: string) {
  return { ...item(token, usage), surface: ELEVATION_SURFACES[token] }
}

export const elevation = {
  notes: ['Each level pairs a surface step with a shadow.'],
  items: [
    elevationItem('elevation-0', 'page, content panels'),
    elevationItem('elevation-1', 'cards, top bar, drawer'),
    elevationItem('elevation-2', 'menus, popovers, toasts'),
    elevationItem('elevation-3', 'dialogs'),
  ],
}

export const focus = {
  notes: [
    'Focus is never removed without a replacement.',
    `Every focusable element shows the same focus ring when focused from the keyboard (:focus-visible): a 1px --amber-accent-500 border or outline, plus a 3px outer ring --amber-focus-ring: ${tokens['focus-ring']}.`,
  ],
  ring: item('focus-ring'),
}

export const motion = {
  notes: ['Under prefers-reduced-motion: reduce, durations are 0ms.'],
  durations: [
    item('duration-fast', 'hover, press, toggle'),
    item('duration-normal', 'dialogs, drawers, toasts'),
  ],
  easing: item('easing', 'everything'),
}

export const iconography = {
  notes: [
    'Icons sit on a 24px grid with a 2px stroke and rounded caps and joins.',
    'Icons inherit currentColor.',
  ],
}

/** The data of each foundation page, keyed by page. */
export const foundations = {
  colour,
  typography,
  spacing,
  radius,
  elevation,
  focus,
  motion,
  icons: iconography,
}
