import type { AppBackendInit } from '@amber-hub/app-sdk/backend'
import manifest from '../manifest.json'
import { deleteMonth, listEntries, saveMonth } from './entries'
import { registerTools } from './tools'

const init: AppBackendInit = (appManager) => {
  appManager.registerRoute('GET', '/status', () => ({
    status: 'ok',
    version: manifest.version,
  }))

  appManager.registerRoute('GET', '/entries', async (context) => ({
    entries: await listEntries(appManager, context.user),
  }))

  appManager.registerRoute('PUT', '/months', async (context) => ({
    entries: await saveMonth(appManager, context.user, context.query, context.body),
  }))

  appManager.registerRoute('DELETE', '/months', (context) =>
    deleteMonth(appManager, context.user, context.query),
  )

  registerTools(appManager)
}

export default init
