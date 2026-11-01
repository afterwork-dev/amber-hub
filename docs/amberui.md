# AmberUI

AmberUI is Amber Hub's design system: the visual and component language for the Hub and
every app it serves. It is dark by default, rounded throughout, built on gray depth, and
uses one confident accent.

This document is the source of truth for implementing AmberUI in code.
Code implements this document. If code and this document disagree, fix one of them in the
same change. Don't leave them drifting.

## 1. Principles

1. **Dark by default.** Every screen is built for low-light, screen-first use. There is no
   light mode, and none is planned.
2. **Depth through gray.** Neutral steps build hierarchy and separation. Separation never
   relies on blur or transparency.
3. **Rounded, always.** Every surface, control and container is rounded. Nothing ships with
   a sharp corner.
4. **One accent, used with intent.** Orange marks the single most important action on a
   screen. It is never decoration and never a large surface fill.

## 2. Tokens

Every token is a CSS custom property prefixed `--amber-`. Components and apps use tokens,
never raw values.

### 2.1 Grayscale

There are eight steps, dark to light. Every surface in the product maps to one of them.
The deck's principles page says "twelve"; the eight below are the real scale.

| Token | Value | Use |
|---|---|---|
| `--amber-canvas` | `#0A0A0A` | page background (E0) |
| `--amber-base` | `#111111` | content panels on the canvas |
| `--amber-card` | `#1D1D1D` | cards, inputs, top bar, drawer (E1) |
| `--amber-raised` | `#2F2F2F` | raised controls, dialogs, hairlines (E2/E3) |
| `--amber-border` | `#454545` | control borders, unchecked toggles |
| `--amber-text-muted` | `#6B6B6B` | disabled text, placeholders, section labels |
| `--amber-text-secondary` | `#C6C6C6` | body copy, inactive navigation |
| `--amber-text-primary` | `#F5F5F3` | headings, values, active text |

### 2.2 Accent

| Token | Value | Use |
|---|---|---|
| `--amber-accent-600` | `#E67A00` | pressed state of accent controls |
| `--amber-accent-500` | `#FF8C00` | **the** accent: primary buttons, checked toggles, focus |
| `--amber-accent-400` | `#FFA733` | accent text on tinted fills; hover of accent controls |
| `--amber-accent-300` | `#FFC066` | rare highlights |
| `--amber-on-accent` | `#111111` | text and icons on accent-500 [measured] |
| `--amber-accent-tint` | `#3C2C18` | "selected" fill: active nav item, badges [measured] |

Use the accent for primary buttons and calls to action, and for active, selected and focus
states. Use it sparingly, and never as a large surface fill.

### 2.3 Status

These are the only hues besides orange. They're reserved for feedback and never used for
surfaces or branding.

| Token | Value | Use |
|---|---|---|
| `--amber-success` | `#3DDC84` | confirmations, completed states |
| `--amber-warning` | `#F5C518` | caution, approaching limits |
| `--amber-error` | `#FF5C5C` | failures, destructive actions |
| `--amber-info` | `#C6C6C6` | neutral, non-urgent messages |

### 2.4 Typography

The only family is **Inter**, self-hosted. Never load it from a third-party CDN.

| Token prefix | Weight | Size | Line height | Use |
|---|---|---|---|---|
| `--amber-type-display-*` | 800 | 48px | 56px | page hero, one per screen at most |
| `--amber-type-heading-*` | 700 | 36px | 44px | page titles |
| `--amber-type-subheading-*` | 600 | 22px | 28px | section and card titles |
| `--amber-type-body-*` | 400 | 16px | 24px | descriptions, table cells, body copy |
| `--amber-type-caption-*` | 500 | 13px | 18px | timestamps, labels, metadata |
| `--amber-type-overline-*` | 500 | 13px | 18px | section labels: uppercase, `letter-spacing: 0.12em` [derived] |

Each style exposes `-size`, `-weight` and `-line-height`. Buttons and nav items use body
size at weight 600.

### 2.5 Spacing and grid

There is a 4px base scale. Use only these values for padding, gaps and margins.

| Token | Value |
|---|---|
| `--amber-space-1` | 4px |
| `--amber-space-2` | 8px |
| `--amber-space-4` | 16px |
| `--amber-space-6` | 24px |
| `--amber-space-8` | 32px |
| `--amber-space-12` | 48px |

The grid has 12 columns with a 24px gutter. Page margins are 80px on desktop (≥1280px),
32px on tablet (768–1279px) and 16px on phone (<768px).

### 2.6 Corner radius

| Token | Value | Use |
|---|---|---|
| `--amber-radius-sm` | 8px | small controls: checkbox (6px, see below), nav items, chips |
| `--amber-radius-md` | 14px | inputs, selects |
| `--amber-radius-lg` | 20px | cards, panels |
| `--amber-radius-xl` | 28px | large panels, top bar, drawer, dialogs |
| `--amber-radius-2xl` | 36px | hero tiles, app icons |
| `--amber-radius-full` | 9999px | buttons, pills, avatars, switches, radios |

Radius scales with control size. The checkbox (20px) uses 6px; that's the only exception.

### 2.7 Elevation

Each level pairs a surface step with a shadow.

| Token | Shadow | Surface | Use |
|---|---|---|---|
| `--amber-elevation-0` | none | canvas / base | page, content panels |
| `--amber-elevation-1` | `0 6px 16px rgba(0,0,0,.35)` | card | cards, top bar, drawer |
| `--amber-elevation-2` | `0 14px 30px rgba(0,0,0,.45)` | raised | menus, popovers, toasts |
| `--amber-elevation-3` | `0 26px 54px rgba(0,0,0,.55)` | raised | dialogs |

### 2.8 Focus

Every focusable element shows the same focus ring when focused from the keyboard
(`:focus-visible`): a 1px `--amber-accent-500` border or outline, plus a 3px outer ring
`--amber-focus-ring: 0 0 0 3px rgba(255,140,0,.18)`. Focus is never removed without a
replacement.

### 2.9 Motion

| Token | Value | Use |
|---|---|---|
| `--amber-duration-fast` | 120ms | hover, press, toggle |
| `--amber-duration-normal` | 200ms | dialogs, drawers, toasts |
| `--amber-easing` | `cubic-bezier(.2,0,0,1)` | everything |

Under `prefers-reduced-motion: reduce`, durations are 0ms.

## 3. Iconography

Icons sit on a 24px grid with a 2px stroke and rounded caps and joins. The library is
**Lucide** (ISC licence), which matches this spec by default. Icons inherit `currentColor`.
Icon-only controls always have an accessible name.

## 4. Components

All sizes are in CSS px. Interactive controls are at least 44px tall, or have a 44px hit
area. Every component is reachable and usable from the keyboard.

### 4.1 Button

The button is a pill (`radius-full`), 48px tall, with 24px inline padding and body text at
weight 600. An optional leading or trailing icon sits 8px from the label.

| Variant | Fill | Text | Notes |
|---|---|---|---|
| primary | accent-500 | on-accent | at most one per screen or dialog; hover accent-400, pressed accent-600 |
| secondary | one step above its surface (raised on canvas, base or card; border on raised) | text-primary | 1px border one step above the fill |
| ghost | none | accent-500 | hover: accent-tint fill |
| danger | error | on-accent | destructive confirmations only |

- **Disabled:** card fill, text-muted, no border, `cursor: not-allowed`, not focusable via
  the `disabled` attribute.
- **Loading:** keeps its width, shows a spinner in place of the label, and is
  `aria-busy="true"`.
- **Size `sm`:** 36px tall, 16px inline padding, caption-size text. Use it in
  dense rows only.

**Icon button:** circular, 48px, with a raised fill and a 20px icon. A notification dot
(8px, accent-500) sits at the top right when flagged. It requires `aria-label`.

### 4.2 Text input

The input is 48px tall, uses `radius-md` and 16px inline padding. It has a card fill, a 1px
raised border, body text in text-primary and a text-muted placeholder.

- **Focused:** accent-500 border plus the focus ring.
- **Disabled:** base fill, a 1px border just above base, and text-muted.
- **Error:** error border, plus an error message below it in caption size, in
  error colour, linked with `aria-describedby`.
- **Field:** a label above the input (caption, text-secondary, 8px gap) and an
  optional hint below (caption, text-muted). A label is required, either visible or as
  `aria-label`.

### 4.3 Select

The select looks the same as the text input, with a trailing chevron-down icon in
text-muted. Version 1 wraps a native `<select>` for accessibility and mobile behaviour.

### 4.4 Switch, checkbox, radio

- **Switch:** a 36×20 track with a 16px knob (`radius-full`). Off: raised track, knob
  text-secondary. On: accent-500 track, white knob. It has `role="switch"` and
  `aria-checked`.
- **Checkbox:** a 20px box with a 6px radius. Unchecked: 1.5px border-colour outline.
  Checked: accent-500 fill with an on-accent check icon. It supports `indeterminate`.
- **Radio:** a 20px circle. Unselected: 1.5px border-colour outline. Selected: 1.5px
  accent-500 ring with a 8px accent-500 dot. Radios are grouped in a radio group with arrow-key
  navigation.
- **Labels:** each control has a label to its right, 12px from the control, in body
  text-secondary. The whole row is the click target (≥44px).

### 4.5 Card

A card has a card fill, `radius-lg` (`radius-xl` when it's a page-level panel), elevation
1 and 32px padding. Its title is subheading, text-primary. Its body is body
text-secondary. A card holds at most one primary action, aligned to the start of the
card. Header, body and actions are spaced 16px apart.

### 4.6 Badge

A badge is a pill with accent-tint fill, accent-400 text in caption size at weight 600,
and 4px × 12px padding. It marks a selected or active state, such as "Active plan".
Status-coloured badges use the status colour as text on a raised fill.

### 4.7 Status message

This is an inline feedback message. It has a raised fill, `radius-md`, 16px padding, a
24px circular status icon in the status colour (check, exclamation, x or info glyph, drawn
in canvas colour), and body text in text-primary. It needs
`role="status"` (success, info) or `role="alert"` (warning, error). It can optionally be dismissed.

### 4.8 Dialog

A dialog has a raised fill, `radius-xl`, elevation 3, 32px padding and a width of
min(480px, 100% − 32px). The title is subheading text-primary. The body is body
text-secondary. Actions are aligned to the end, 8px apart, with the primary action last.

- **Scrim:** `rgba(0,0,0,.6)` over the page.
- **Behaviour:** it's a modal with `role="dialog"`, `aria-modal="true"`, and is
  labelled by its title. Focus moves inside on open and is trapped there. Escape and
  clicking the scrim close it unless it's marked persistent. Focus returns to the trigger
  on close.
- **Confirm dialog:** a title, a message, Cancel (secondary) and Confirm (primary, or
  danger for destructive actions). It resolves to true or false.

### 4.9 Top navigation bar

The top bar is 72px tall, with a card fill, `radius-xl` and elevation 1, and sits within
the page margins. From the start: the app mark (24px accent tile, radius-sm) and name
(subheading 600 text-primary), then section links (body, weight 500, text-secondary). The
active section is accent-500 text at weight 600, with `aria-current="page"`. At the end:
icon buttons and the avatar, all with 48px targets.

### 4.10 Left navigation drawer

The drawer has a card fill and `radius-xl`, and is 280–320px wide on desktop (default
288px). Below 1024px it hides behind a menu icon button in the top bar and opens as an
overlay with a scrim.

- **Header:** app mark and name.
- **Sections:** an overline label (text-muted), followed by nav items.
- **Nav item:** 44px tall, `radius-sm`, 20px inline padding, body text-secondary. Hover:
  raised fill. Active: accent-tint fill, accent-400 text at weight 600,
  `aria-current="page"`.
- **Account switcher:** pinned to the bottom and separated by a 1px raised hairline. It
  shows a 44px avatar circle (raised), the name in body text-primary and a trailing
  chevron-right.

### 4.11 Spinner

The spinner shows that something is in progress when you can't tell how long it will
take.

- **Sizes:** 16px (inline text, `sm` buttons), 20px (default, buttons), 32px (a section or
  page that is loading).
- **Drawing:** a 2px ring. The track is raised and the arc is accent-500, covering a
  quarter of the circle. It turns once every 800ms at linear speed. Inside an accent fill
  (a loading primary button), the track is accent-600 and the arc is on-accent.
- **Reduced motion:** it keeps turning, because it is the only sign of progress, but
  slows to one turn every 1.6s.
- **Delay:** in sections and pages, it appears only after 300ms, so fast loads don't
  flicker. Inside buttons there's no delay.
- **Accessibility:** `role="progressbar"`, without `aria-valuenow`, with `aria-label`
  ("Loading" by default). Inside a button that is already `aria-busy`, it's
  `aria-hidden`.
- **Use:** use it for actions and refreshes. For the first load of a content area, use
  skeletons (4.17).

### 4.12 Toast

A toast briefly confirms something that just happened, such as "Entry saved", without
interrupting.

- **Container:** raised fill, `radius-md`, elevation 2 and 16px padding. Its width is at
  least 280px and at most min(480px, 100% − 32px).
- **Anatomy, start to end:** an optional 24px status icon (as in 4.7), the message in
  body text-primary (it wraps and isn't truncated), an optional single action (ghost
  button, `sm`) and a close icon button (`sm`).
- **Variants:** neutral (no icon), success, info, warning, error.
- **Position:** bottom-centre, 24px above the bottom of the viewport plus the device's
  safe area. At most three show at once, stacked with 8px gaps and the newest at the
  bottom. A fourth closes the oldest.
- **Timing:** neutral, success and info close after 5s. Warning, error and any toast with
  an action stay until dismissed. The timer pauses while hovered, while focus is inside
  the toast, and while the page is hidden.
- **Motion:** it enters fading in and rising 8px (normal duration), and exits fading out
  (fast duration).
- **Accessibility:** each app renders one live region once at its root. Neutral, success
  and info toasts are announced politely (`aria-live="polite"`); warning and error use
  `role="alert"`. A toast never takes focus. Its action and close button can be reached
  by keyboard, and Escape closes it while focus is inside.
- **Use:** use toasts for outcomes of the user's own actions. Never use one for an error
  the user must fix in a form; that belongs in the field (4.2) or a status message (4.7).

### 4.13 Menu

A menu is a short list of actions that opens from a button, such as the user menu or a
row's "more" actions.

- **Trigger:** any button. While open it has `aria-haspopup="menu"` and
  `aria-expanded="true"`.
- **Panel:** raised fill, `radius-md`, elevation 2 and 8px padding. Its width is at least
  200px (or the trigger's width, if larger) and at most 320px. Its height is at most 50%
  of the viewport, and it scrolls beyond that. It opens 8px below the trigger, aligned to
  its start, and flips above or to the end when there isn't room. It uses the browser's
  top layer (the `popover` attribute), so containers don't clip it and it works inside a
  shadow root.
- **Item:** 44px tall, `radius-sm`, 16px inline padding, body text-secondary. It can have
  a 20px leading icon (text-muted) and trailing caption text (text-muted), such as a
  shortcut.
  - Hover or keyboard highlight: card fill, text-primary.
  - Disabled: text-muted. It's skipped by arrow keys and can't be activated.
  - Destructive: error text and icon.
  - Checkable items (`menuitemcheckbox`, `menuitemradio`) show a trailing check in
    accent-500 when on.
- **Separator and group label:** a 1px raised hairline with 8px above and below; group
  labels use the overline style in text-muted.
- **Keyboard:**
  - Enter, Space or ↓ on the trigger opens the menu and highlights the first item. ↑
    opens it and highlights the last.
  - ↑ and ↓ move through items and wrap at the ends. Home and End jump to the first and
    last item. Typing a letter jumps to the next item that starts with it.
  - Enter or Space activates an item and closes the menu.
  - Escape closes the menu and returns focus to the trigger. Tab closes it and moves on.
    Clicking outside closes it.
- **Accessibility:** the panel has `role="menu"` and is labelled by its trigger. Items are
  `role="menuitem"`.
- **Use:** use menus for actions only. To choose a value in a form, use a select (4.3). To
  move between pages, use navigation (4.9, 4.10).

### 4.14 Segmented control

A segmented control switches between two to five views or filters of the same content,
such as "Month / Year".

- **Container:** card fill, `radius-full`, 4px padding, 48px tall (`sm`: 36px). By
  default it's as wide as its content; with `block` it fills its parent and the segments
  share the width equally.
- **Segment:** a pill, 40px tall (`sm`: 28px), with 16px inline padding and body text at
  weight 500 in text-secondary. It can have a 20px icon. Icon-only segments need an
  `aria-label`. Labels are at most two words.
  - Hover: raised fill.
  - Selected: accent-tint fill, accent-400 text at weight 600. The fill slides between
    segments (fast duration).
  - Disabled: text-muted, can't be selected.
  - Focus: the focus ring on the segment.
- **Behaviour:** it's a radio group (`role="radiogroup"` with `role="radio"` segments)
  and needs a group label. Only the selected segment is in the tab order. The arrow keys
  move to the next or previous segment and select it immediately, wrapping at the ends.
  It supports `v-model`.
- **Use:** use it for switching what's shown. Never use it for actions or for more than
  five options; use a select instead.

### 4.15 Table

A table shows rows of records that people compare by column, such as transactions or
monthly values.

- **Container:** card fill, `radius-lg`, elevation 1, with content clipped to the
  corners. It scrolls horizontally inside the container when the columns don't fit. When
  the container has a fixed height, it scrolls vertically and the header row stays
  pinned.
- **Header row:** 44px tall. Cells use the overline style (caption, weight 500,
  uppercase, 0.12em letter-spacing) in text-muted, with a 1px raised hairline below.
- **Body rows:** at least 52px tall. Cells have 16px inline padding (24px on the first and
  last column) and use body text-secondary. The row's main column is text-primary. A 1px
  raised hairline separates rows; there's none after the last one.
  - Hover, only when rows are interactive: base fill.
  - Selected: accent-tint fill.
- **Footer row:** optional, for totals. It has a 1px raised hairline above and uses
  text-primary at weight 600.
- **Numbers:** numeric columns and their headers are right-aligned and use
  `font-variant-numeric: tabular-nums`. Amounts are formatted by the app, not the table.
- **Sorting:** a sortable header is a button with a 16px chevron. The chevron is
  text-muted when the column isn't sorted and accent-500 when it is. Clicking switches
  between ascending and descending. The sorted column's `<th>` has `aria-sort`. One
  column is sorted at a time.
- **Row actions:** a trailing column of `sm` icon buttons, or one "more" icon button that
  opens a menu (4.13). Its header is visually empty but has a label for screen readers.
- **Opening a row:** when a row leads somewhere, its main cell holds a link or button that
  stretches over the whole row. The table stays a plain `<table>`, not a grid.
- **States:** these fill the table body across all columns.
  - Loading with no data yet: five skeleton rows (4.17).
  - Refreshing existing data: a 16px spinner at the end of the header row.
  - Empty: an empty state (4.16).
  - Error: an error status message (4.7) with a "Try again" ghost button.
- **Narrow screens:** a column can be marked to hide below tablet (1024px) or phone
  (768px) widths. The columns that remain scroll horizontally.
- **Accessibility:** it uses semantic `<table>`, `<thead>`, `<th scope="col">` and
  `<tbody>`, and a `<caption>` that can be visually hidden.

### 4.16 Empty state

An empty state explains why an area has no content and what to do about it.

- **Layout:** a centred column, at most 400px wide, with 48px vertical padding. From top
  to bottom:
  - a 40px icon in text-muted
  - 16px below, the title in subheading text-primary
  - 8px below, a description in body text-secondary, centred and at most two sentences
  - 24px below, an optional single action
- **Variants:**
  - First use ("No entries yet"): the action creates the first item. It's a primary button
    only if that is the screen's main action; otherwise it's secondary.
  - No results ("Nothing matches these filters"): a ghost "Clear filters" action.
- **Copy:** say what's missing and what to do next, without blaming the user.
- **Placement:** it fills the body of its container (a card, table or page section).
  Errors use a status message (4.7) instead.

### 4.17 Skeleton

Skeletons hold the place of content during a first load, so the layout doesn't jump.

- **Shapes:**
  - Text line: 16px tall for body text and 12px for caption, with a given width and
    `radius-sm`.
  - Block: any size, with the radius of the element it stands in for.
  - Circle: avatars.
- **Look:** raised fill. It pulses from full opacity to 60% and back over 1.6s
  (ease-in-out). Under reduced motion it's static.
- **Behaviour:** skeletons copy the shape of the real layout. They appear after 300ms, and
  the real content replaces them without changing the layout.
- **Accessibility:** skeleton shapes are `aria-hidden`. Their container has
  `aria-busy="true"` and a visually hidden "Loading" label.
- **Use:** use them for the first load of content areas. For actions and refreshes, use the
  spinner (4.11).

## 7. How AmberUI ships in code

- **Package:** `@amber-hub/ui` in `tools/ui/`, built on Vue 3. It provides
  - `@amber-hub/ui/tokens.css`: the custom properties, declared on `:root, :host`
  - `@amber-hub/ui/styles.css`: all component styles as plain global CSS with `amber-`
    prefixed class names. There are no scoped or runtime-injected styles, so the file can
    be inlined into an app's shadow root.
  - `@amber-hub/ui`: the components (`AmberButton`, `AmberTextField`, …), fully typed
  - `@amber-hub/ui/tokens`: the same token values as a typed object, for charts and other
    places CSS can't reach. A test fails if it drifts from `tokens.css`.
  - `@amber-hub/ui/icons`: the Lucide icons (`lucide-vue-next`), re-exported
- **The Hub** loads `tokens.css` and the Inter font at document level. Fonts must load at
  document level because `@font-face` inside a shadow root is not applied. Custom
  properties inherit through shadow boundaries, so apps receive the tokens automatically.
- **Apps** inline `styles.css` into their own shadow root at mount.
- **The gallery** in `tools/ui-gallery/` (`npm run gallery`) shows every token, component,
  state and layout. It's the place to review AmberUI changes.
- **Vuetify** is being replaced. New UI uses AmberUI only. Existing Vuetify screens are
  migrated one app at a time, and Vuetify is removed once nothing uses it.
