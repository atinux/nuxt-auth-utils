export default defineNuxtConfig({
  // ssr: false,
  compatibilityDate: '2024-06-17',
  devServer: {
    host: '127.0.0.1',
  },
  extends: ['@nuxt/ui-pro'],
  modules: ['nuxt-auth-utils', '@nuxt/ui'],
  auth: {},
  devtools: { enabled: true },
  imports: {
    autoImport: true,
  },
  nitro: {
    experimental: {
      database: true,
    },
  },
  routeRules: {
    '/': {
      // prerender: true,
      // swr: 5,
      // ssr: false,
    },
  },
})
