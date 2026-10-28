export interface AppManifest {
  id: string
  displayName: string
  version: string
  frontend?: { entry: string }
  backend?: { entry: string }
}

export interface AppUploadResult {
  appId: string
  displayName: string
}
