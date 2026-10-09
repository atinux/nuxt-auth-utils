export default defineNuxtConfig({
  modules: [
    '../../../src/module',
  ],

  compatibilityDate: '2024-12-13',

  nitro: {
    experimental: {
      websocket: true,
    },
  },
})
