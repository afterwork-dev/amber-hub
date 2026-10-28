import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '../pages/home/HomePage.vue'
import DashboardPage from '../pages/home/DashboardPage.vue'
import AppViewPage from '../pages/home/AppViewPage.vue'
import SettingsPage from '../pages/settings/SettingsPage.vue'
import ApiKeyPage from '../pages/settings/ApiKeyPage.vue'
import RegisterPage from '../pages/register/RegisterPage.vue'
import LoginPage from '../pages/login/LoginPage.vue'
import { requireAuth } from './guards/requireAuth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: HomePage,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardPage },
      { path: 'apps/:appId', name: 'app-view', component: AppViewPage, props: true },
    ],
  },
  {
    path: '/settings',
    component: SettingsPage,
    meta: { requiresAuth: true },
    children: [{ path: '', name: 'settings-api-key', component: ApiKeyPage }],
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(requireAuth)

export default router
