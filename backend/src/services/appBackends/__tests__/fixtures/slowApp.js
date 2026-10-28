export default function init(appManager) {
  appManager.registerRoute('GET', '/slow', () => new Promise(() => {}))
}
