import type { InjectionKey, Ref } from 'vue'

export interface AppShellContext {
  /** True below 1024px, where the drawer hides behind the top bar's menu button. */
  narrow: Ref<boolean>
  /** Whether the overlay drawer is open. */
  open: Ref<boolean>
  drawerId: string
  openDrawer: () => void
  closeDrawer: () => void
  /** The top bar registers its menu button here so the shell can return focus to it. */
  registerMenuButton: (element: HTMLElement | undefined) => void
}

export const appShellKey: InjectionKey<AppShellContext> = Symbol('amber-app-shell')

// Same reason as the module counter in useField.ts: useId() alone is not unique across apps.
let shellCount = 0
export function nextShellId() {
  return shellCount++
}
