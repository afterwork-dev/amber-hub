export interface AppContext {
  appId: string
}

export type AppMount = (root: ShadowRoot, context: AppContext) => void
export type AppUnmount = (root: ShadowRoot) => void
