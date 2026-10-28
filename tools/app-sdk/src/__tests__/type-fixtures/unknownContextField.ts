import type { AppBackendInit } from '../../backend'

const init: AppBackendInit = (appManager) => {
  appManager.registerRoute('GET', '/whoami', (context) => {
    // @ts-expect-error - `sessionToken` does not exist on RouteContext
    return context.sessionToken
  })
}

void init
