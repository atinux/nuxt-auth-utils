export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],
  modules: [
    '../src/module',
    '@nuxt/ui'
  ],
  auth: {},
  ui: {
    icons: ['simple-icons']
  },
  devtools: { enabled: true },
  imports: {
    autoImport: true
  }
})
