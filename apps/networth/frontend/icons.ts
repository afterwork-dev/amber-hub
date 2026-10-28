/**
 * Vuetify's default icon set is class-based, and the Hub's `@mdi/font` rules live in the document,
 * which a shadow root never sees. A `svg:` prefixed path resolves to an inline SVG instead.
 */
export const PLUS = 'svg:M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'

export const PLUS_MINUS = 'svg:M19,19V21H5V19H19M11,4V9H6V11H11V16H13V11H18V9H13V4H11Z'

export const DELETE_OUTLINE =
  'svg:M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z'
