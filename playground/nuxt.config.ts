export default defineNuxtConfig({
  // ssr: false,
  extends: ['@nuxt/ui-pro'],
  modules: ['nuxt-auth-utils', '@nuxt/ui', '@vueuse/nuxt'],
  imports: {
    autoImport: true,
  },
  devtools: { enabled: true },
  runtimeConfig: {
    oauth: {
      bluesky: {
        redirectURL: 'http://127.0.0.1:3000/auth/bluesky',
        scope: ['transition:generic'],
      },
    },
  },
  routeRules: {
    '/': {
      // prerender: true,
      // swr: 5,
      // ssr: false,
    },
  },
  devServer: {
    host: '127.0.0.1',
  },
  compatibilityDate: '2024-06-17',
  nitro: {
    experimental: {
      database: true,
      websocket: true,
    },
  },
  auth: {
    webAuthn: true,
  },
})
