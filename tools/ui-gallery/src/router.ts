import { createRouter, createWebHistory, type RouteComponent } from 'vue-router'
import { pages } from './pages'

const components: Record<string, () => Promise<RouteComponent>> = {
  '/foundations/colour': () => import('./pages/ColourPage.vue'),
  '/foundations/typography': () => import('./pages/TypographyPage.vue'),
  '/foundations/spacing': () => import('./pages/SpacingPage.vue'),
  '/foundations/radius': () => import('./pages/RadiusPage.vue'),
  '/foundations/elevation': () => import('./pages/ElevationPage.vue'),
  '/foundations/focus': () => import('./pages/FocusPage.vue'),
  '/foundations/motion': () => import('./pages/MotionPage.vue'),
  '/foundations/icons': () => import('./pages/IconsPage.vue'),
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/foundations/colour' },
    ...pages.map((page) => {
      const component = components[page.path]
      if (!component) throw new Error(`No component for gallery page ${page.path}`)
      return { path: page.path, component, meta: { title: page.title } }
    }),
  ],
})

export default router
