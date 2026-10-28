export function dynamicImport(url: string): Promise<unknown> {
  return import(/* @vite-ignore */ url)
}
