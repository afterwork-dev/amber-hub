export default function init(appManager) {
  appManager.registerRoute('GET', '/crash', () => {
    process.exit(1)
  })
}
