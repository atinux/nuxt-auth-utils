export default defineNuxtConfig({
  // ssr: false,
  extends: ['@nuxt/ui-pro'],
  modules: ['../src/module', '@nuxt/ui', '@vueuse/nuxt'],
  imports: {
    autoImport: true,
  },
  devtools: { enabled: true },
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
    atproto: true,
    // loadStrategy: 'client-only'
  },
  icon: {
    customCollections: [{
      prefix: 'custom',
      dir: './assets/icons',
    }],
  },
})
