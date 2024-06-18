export default defineNuxtConfig({
  compatibilityDate: '2024-06-17',
  extends: ['@nuxt/ui-pro'],
  modules: [
    'nuxt-auth-utils',
    '@nuxt/ui',
  ],
  auth: {},
  ui: {
    icons: ['simple-icons'],
  },
  devtools: { enabled: true },
  imports: {
    autoImport: true,
  },
  routeRules: {
    '/': {
      // prerender: true,
      // swr: 5,
      // ssr: false,
    },
  },
})
