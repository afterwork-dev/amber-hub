export default function init(appManager) {
  appManager.registerRoute('GET', '/whoami', (context) => ({ calledBy: context.user.username }))
}
