import type { AppBackendInit } from '@amber-hub/app-sdk/backend'
import manifest from '../manifest.json'
import { deleteAsset, deleteEntry } from './deleteRecords'
import { ASSETS_COLLECTION, createEntry, listAssets, listEntries } from './entries'
import { registerTools } from './tools'
import { validateNewAsset } from './validateNewAsset'

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

  appManager.registerRoute('POST', '/assets', async (context) => {
    const asset = validateNewAsset(context.body)

    return appManager.storage.store(ASSETS_COLLECTION, {
      ...asset,
      userId: context.user.id,
      createdAt: new Date().toISOString(),
    })
  })

  appManager.registerRoute('GET', '/assets', async (context) => ({
    assets: await listAssets(appManager, context.user),
  }))

  appManager.registerRoute('DELETE', '/entries', (context) =>
    deleteEntry(appManager, context.user, context.query),
  )

  appManager.registerRoute('DELETE', '/assets', (context) =>
    deleteAsset(appManager, context.user, context.query),
  )

  registerTools(appManager)
}

export default init
