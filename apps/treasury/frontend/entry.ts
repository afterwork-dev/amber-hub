import { createApp, type App } from 'vue'
import { createVuetify } from 'vuetify'
import type { AppMount, AppUnmount } from '@amber-hub/app-sdk/frontend'
import shadowStyles from './shadow-styles.css?inline'
import TreasuryApp from './TreasuryApp.vue'

let instance: App | null = null

export const mount: AppMount = (root) => {
  const style = document.createElement('style')
  style.textContent = shadowStyles
  root.appendChild(style)

  const mountPoint = document.createElement('div')
  root.appendChild(mountPoint)

  instance = createApp(TreasuryApp, { host: root.host })
  instance.use(createVuetify({ theme: false }))
  instance.mount(mountPoint)
}

export const unmount: AppUnmount = (root) => {
  instance?.unmount()
  instance = null
  root.replaceChildren()
}
