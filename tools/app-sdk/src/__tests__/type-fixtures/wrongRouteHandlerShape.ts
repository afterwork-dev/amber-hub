import type { AppBackendInit } from '../../backend'

const init: AppBackendInit = (appManager) => {
  // @ts-expect-error - handler requires a second parameter the caller never supplies
  appManager.registerRoute('GET', '/whoami', (context: unknown, extra: string) => {
    return { context, extra }
  })
}

void init
