export default async function init(appManager) {
  // Storing during init() proves the Hub serves storage requests before the backend is ready.
  const bootRecord = await appManager.storage.store('boot', { startedAt: 'init' })

  appManager.registerRoute('GET', '/boot-record', () => ({ bootRecord }))

  appManager.registerRoute('POST', '/notes', async (context) => ({
    note: await appManager.storage.store('notes', context.body),
  }))

  appManager.registerRoute('GET', '/notes', async (context) => {
    const filter = context.query.done === undefined ? undefined : { done: context.query.done === 'true' }
    return { notes: await appManager.storage.query('notes', filter) }
  })

  appManager.registerRoute('DELETE', '/notes', async (context) => {
    await appManager.storage.remove('notes', context.query.id)
    return { removed: true }
  })

  // Same logical collection name as storageAppTwo.js — the isolation matrix depends on it.
  appManager.registerRoute('POST', '/items', async (context) => ({
    item: await appManager.storage.store('items', context.body),
  }))

  appManager.registerRoute('GET', '/items', async () => ({
    items: await appManager.storage.query('items'),
  }))

  // Values built inside the app, so the JSON transport (not the test's own call) shapes them.
  appManager.registerRoute('POST', '/json-edges', async () => ({
    stored: await appManager.storage.store('edges', {
      when: new Date('2026-01-02T03:04:05.000Z'),
      missing: undefined,
      notANumber: Number.NaN,
      nested: { list: [1, 'two', { three: true }], deep: { deeper: null } },
    }),
  }))

  // Lets a test observe what a failed storage call looks like from inside the app.
  appManager.registerRoute('GET', '/caught-error', async (context) => {
    try {
      await appManager.storage.remove(context.query.collection ?? 'notes', context.query.id ?? 'x')
      return { errorCode: null }
    } catch (error) {
      return { name: error.name, errorCode: error.errorCode, errorMessage: error.errorMessage }
    }
  })
}
