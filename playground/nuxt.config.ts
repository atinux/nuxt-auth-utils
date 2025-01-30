export default defineNuxtConfig({
  // ssr: false,
  extends: ['@nuxt/ui-pro'],
  modules: ['nuxt-auth-utils', '@nuxt/ui', '@vueuse/nuxt'],
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
      // tasks: true,
      websocket: true,
    },
    // scheduledTasks: {
    //   '*/1 * * * *': ['clear-sessions'], // every minute clear overdue sessions
    // },
  },
  auth: {
    webAuthn: true,
    // storageType: 'cache',
    // sessionInactivityMaxAge: 60 * 2, // 2 minutes
    // autoExtendSession: true,
  },
  // runtimeConfig: {
  //   session: {
  //     maxAge: 60 * 60 * 24 * 7, // 7 days
  //   },
  // },
})
