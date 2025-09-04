export default defineNuxtConfig({
  // ssr: false,
  modules: ['../src/module', '@nuxt/ui', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],
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
  ui: {
    mdc: true,
  },
  icon: {
    customCollections: [{
      prefix: 'custom',
      dir: './assets/icons',
    }],
  },
})
