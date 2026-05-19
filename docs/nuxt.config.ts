export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/content', 'nuxt-og-image'],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  site: {
    url: 'https://auth-utils.nuxt.com/',
    name: 'Nuxt Auth Utils',
  },

  colorMode: {
    preference: 'dark',
  },

  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },

  compatibilityDate: '2025-05-18',

  ogImage: {
    zeroRuntime: true,
  },
})
