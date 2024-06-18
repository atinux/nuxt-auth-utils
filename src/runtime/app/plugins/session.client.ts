import { defineNuxtPlugin, useUserSession } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  if (!nuxtApp.payload.serverRendered || Boolean(nuxtApp.payload.prerenderedAt) || Boolean(nuxtApp.payload.isCached)) {
    nuxtApp.hook('app:mounted', async () => {
      await useUserSession().fetch()
    })
  }
})
