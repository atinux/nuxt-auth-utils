// TODO: https://github.com/nuxt/module-builder/issues/141
import {} from 'nuxt/app'
import { defineNuxtPlugin, useUserSession } from '#imports'

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

  const isInPopup = useCookie('temp-nuxt-auth-utils-popup')
  if (isInPopup.value) {
    // There is a cookie, so we are coming back in the popup
    isInPopup.value = null
    const error = useError()
    if (!error.value) window.close()
  }
})
