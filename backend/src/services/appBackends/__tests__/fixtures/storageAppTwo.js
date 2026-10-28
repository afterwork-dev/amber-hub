// A second, independent app that deliberately uses the SAME logical collection name ("items")
// as storageApp.js, so isolation is proven across two genuinely separate child processes.
export default function init(appManager) {
  appManager.registerRoute('POST', '/items', async (context) => ({
    item: await appManager.storage.store('items', context.body),
  }))

  appManager.registerRoute('GET', '/items', async () => ({
    items: await appManager.storage.query('items'),
  }))

  // Lets a test have this app attempt to reach out of its own namespace.
  appManager.registerRoute('GET', '/reach', async (context) => {
    try {
      return { items: await appManager.storage.query(context.query.collection) }
    } catch (error) {
      return { errorCode: error.errorCode }
    }
  })
}
