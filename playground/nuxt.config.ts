export default defineNuxtConfig({
  modules: ['../src/module'],
  auth: {},
  devtools: { enabled: true },
  imports: {
    autoImport: true
  }
})
