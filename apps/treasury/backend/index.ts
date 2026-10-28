import type { AppBackendInit } from '@amber-hub/app-sdk/backend'
import manifest from '../manifest.json'
import { createEntry, listEntries } from './entries'
import { registerTools } from './tools'

const init: AppBackendInit = (appManager) => {
  appManager.registerRoute('GET', '/status', () => ({
    status: 'ok',
    version: manifest.version,
  }))

  appManager.registerRoute('POST', '/entries', (context) =>
    createEntry(appManager, context.user, context.body),
  )

  appManager.registerRoute('GET', '/entries', async (context) => ({
    entries: await listEntries(appManager, context.user),
  }))

  registerTools(appManager)
}

export default init
