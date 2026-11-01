import { inject, type InjectionKey, type Ref } from 'vue'

export interface ViewportPreset {
  id: 'phone' | 'tablet' | 'desktop'
  label: string
  width: number
}

// Content frame widths for the toolbar. The `viewport` query holds the id; no query is Full.
export const viewportPresets: readonly ViewportPreset[] = [
  { id: 'phone', label: 'Phone 390', width: 390 },
  { id: 'tablet', label: 'Tablet 834', width: 834 },
  { id: 'desktop', label: 'Desktop 1440', width: 1440 },
]

export function findPreset(query: unknown): ViewportPreset | undefined {
  return viewportPresets.find((preset) => preset.id === query)
}

/** The content frame's current width in px, provided by the shell. */
export const frameWidthKey: InjectionKey<Ref<number>> = Symbol('frameWidth')

export function useFrameWidth(): Ref<number> {
  const width = inject(frameWidthKey)
  if (!width) throw new Error('useFrameWidth() needs the gallery shell')
  return width
}
