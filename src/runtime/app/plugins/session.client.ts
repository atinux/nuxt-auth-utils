// TODO: https://github.com/nuxt/module-builder/issues/141
import {} from 'nuxt/app'
import { defineNuxtPlugin, useUserSession, useError } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  if (!nuxtApp.payload.serverRendered) {
    await useUserSession().fetch()
  }
  else if (Boolean(nuxtApp.payload.prerenderedAt) || Boolean(nuxtApp.payload.isCached)) {
    // To avoid hydration mismatch
    nuxtApp.hook('app:mounted', async () => {
      await useUserSession().fetch()
    })
  }

  if (localStorage.getItem('temp-nuxt-auth-utils-popup')) {
    // There is a local storage item. That's mean we are coming back in the popup
    localStorage.removeItem('temp-nuxt-auth-utils-popup')
    const error = useError()
    if (!error.value) window.close()
  }
})
