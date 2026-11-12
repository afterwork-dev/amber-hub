import { inject, type InjectionKey } from 'vue'

export interface AmberConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export type AmberConfirm = (options: AmberConfirmOptions) => Promise<boolean>

export const confirmKey: InjectionKey<AmberConfirm> = Symbol('amber-confirm')

// Returns confirm(), which resolves to the user's answer. Call it in setup below an <AmberConfirmHost>.
export function useConfirm(): AmberConfirm {
  const confirm = inject(confirmKey, undefined)
  if (!confirm) throw new Error('useConfirm() needs an <AmberConfirmHost> above this component')
  return confirm
}
