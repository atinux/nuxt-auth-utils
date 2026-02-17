// TODO: https://github.com/nuxt/module-builder/issues/141
import type { NuxtApp } from 'nuxt/app'
import { defineNuxtPlugin, useUserSession, useError } from '#imports'

export default defineNuxtPlugin(async (nuxtApp: NuxtApp) => {
  if (!nuxtApp.payload.serverRendered) {
    await useUserSession().fetch()
  }
  else if (Boolean(nuxtApp.payload.prerenderedAt) || Boolean(nuxtApp.payload.isCached)
    || nuxtApp.$config.public.auth.loadStrategy === 'client-only'
  ) {
    // To avoid hydration mismatch
    nuxtApp.hook('app:suspense:resolve', async () => {
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
