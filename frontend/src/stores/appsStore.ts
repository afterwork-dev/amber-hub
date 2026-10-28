import { defineStore } from 'pinia'
import { listApps, type AppMetadata } from '../services/appService'

interface AppsState {
  loading: boolean
  apps: AppMetadata[]
  error: string | null
}

export const useAppsStore = defineStore('apps', {
  state: (): AppsState => ({
    loading: false,
    apps: [],
    error: null,
  }),
  getters: {
    appFor: (state) => (appId: string): AppMetadata | undefined =>
      state.apps.find((app) => app.id === appId),
  },
  actions: {
    async load(): Promise<void> {
      this.loading = true
      this.error = null

      try {
        this.apps = await listApps()
      } catch (error) {
        this.apps = []
        this.error = error instanceof Error ? error.message : 'Failed to load apps'
      } finally {
        this.loading = false
      }
    },
  },
})
