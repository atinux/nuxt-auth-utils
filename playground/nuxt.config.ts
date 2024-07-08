export default defineNuxtConfig({
  compatibilityDate: "2024-06-17",
  devServer: {
    host: "127.0.0.1",
  },
  extends: ["@nuxt/ui-pro"],
  modules: ["nuxt-auth-utils", "@nuxt/ui"],
  auth: {},
  ui: {
    icons: ["simple-icons", "gravity-ui"],
  },
  devtools: { enabled: true },
  imports: {
    autoImport: true,
  },
  routeRules: {
    "/": {
      // prerender: true,
      // swr: 5,
      // ssr: false,
    },
  },
});
