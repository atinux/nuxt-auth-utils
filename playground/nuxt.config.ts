export default defineNuxtConfig({
  // ssr: false,
  modules: ['../src/module', '@nuxt/ui', '@vueuse/nuxt'],
  imports: {
    autoImport: true,
  },
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
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
  future: {
    compatibilityVersion: 5,
  },
  compatibilityDate: '2024-06-17',
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  auth: {
    webAuthn: true,
    atproto: true,
    // loadStrategy: 'none',
    // loadStrategy: 'client-only',
  },
  icon: {
    customCollections: [{
      prefix: 'custom',
      dir: './assets/icons',
    }],
  },
})
