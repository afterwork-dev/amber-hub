export default function init(appManager) {
  appManager.registerRoute('GET', '/throw', () => {
    throw new Error('this internal detail should never reach the caller')
  })
}
