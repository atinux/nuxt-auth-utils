export default defineNuxtConfig({
  // ssr: false,
  compatibilityDate: '2024-06-17',
  devServer: {
    host: '127.0.0.1',
  },
  extends: ['@nuxt/ui-pro'],
  modules: ['nuxt-auth-utils', '@nuxt/ui'],
  auth: {},
  ui: {
    icons: ['simple-icons', 'gravity-ui'],
  },
  devtools: { enabled: true },
  imports: {
    autoImport: true,
  },
  nitro: {
    experimental: {
      database: true,
    },
  },
  runtimeConfig: {
    passwordHashRounds: 12,
  },
  routeRules: {
    '/': {
      // prerender: true,
      // swr: 5,
      // ssr: false,
    },
  },
})
