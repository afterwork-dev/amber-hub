import { describe, it, expect } from 'vitest'
import router from '../index'
import HomePage from '../../pages/home/HomePage.vue'
import DashboardPage from '../../pages/home/DashboardPage.vue'
import AppViewPage from '../../pages/home/AppViewPage.vue'
import SettingsPage from '../../pages/settings/SettingsPage.vue'
import ApiKeyPage from '../../pages/settings/ApiKeyPage.vue'
import RegisterPage from '../../pages/register/RegisterPage.vue'
import LoginPage from '../../pages/login/LoginPage.vue'

describe('router', () => {
  it('maps the root path to HomePage, with a default child rendering DashboardPage as "dashboard"', () => {
    const homeRoute = router.options.routes.find((route) => route.path === '/')

    expect(homeRoute?.component).toBe(HomePage)
    expect(homeRoute?.meta?.requiresAuth).toBe(true)

    const dashboardChild = homeRoute?.children?.find((child) => child.path === '')
    expect(dashboardChild?.name).toBe('dashboard')
    expect(dashboardChild?.component).toBe(DashboardPage)
  })

  it('maps /apps/:appId to AppViewPage as "app-view", passing appId as a prop', () => {
    const homeRoute = router.options.routes.find((route) => route.path === '/')
    const appViewChild = homeRoute?.children?.find((child) => child.path === 'apps/:appId')

    expect(appViewChild?.name).toBe('app-view')
    expect(appViewChild?.component).toBe(AppViewPage)
    expect(appViewChild?.props).toBe(true)
  })

  it('resolves /apps/some-id to the app-view route with appId in params', () => {
    const resolved = router.resolve('/apps/some-id')

    expect(resolved.name).toBe('app-view')
    expect(resolved.params.appId).toBe('some-id')
  })

  it('maps /settings to SettingsPage, with a default child rendering ApiKeyPage as "settings-api-key"', () => {
    const settingsRoute = router.options.routes.find((route) => route.path === '/settings')

    expect(settingsRoute?.component).toBe(SettingsPage)
    expect(settingsRoute?.meta?.requiresAuth).toBe(true)

    const apiKeyChild = settingsRoute?.children?.find((child) => child.path === '')
    expect(apiKeyChild?.name).toBe('settings-api-key')
    expect(apiKeyChild?.component).toBe(ApiKeyPage)
  })

  it('resolves /settings to the settings-api-key route, inheriting requiresAuth from its parent', () => {
    const resolved = router.resolve('/settings')

    expect(resolved.name).toBe('settings-api-key')
    expect(resolved.meta.requiresAuth).toBe(true)
  })

  it('maps /register to RegisterPage', () => {
    const registerRoute = router.options.routes.find((route) => route.path === '/register')

    expect(registerRoute?.name).toBe('register')
    expect(registerRoute?.component).toBe(RegisterPage)
  })

  it('maps /login to LoginPage', () => {
    const loginRoute = router.options.routes.find((route) => route.path === '/login')

    expect(loginRoute?.name).toBe('login')
    expect(loginRoute?.component).toBe(LoginPage)
  })

})
