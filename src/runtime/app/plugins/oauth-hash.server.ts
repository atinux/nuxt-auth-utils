import { defineNuxtPlugin, useHead, useRuntimeConfig } from '#imports'

// In Facebook and Instagram login, the URL is redirected with `#_=_` which is not a valid route,
// so we remove it from the URL before the app is loaded.
// https://stackoverflow.com/questions/7131909/facebook-callback-appends-to-return-url
export default defineNuxtPlugin({
  name: 'auth-utils:oauth-hash',
  setup() {
    const oauth = useRuntimeConfig().oauth as Record<string, { clientId?: string } | undefined> | undefined
    if (!oauth?.facebook?.clientId && !oauth?.instagram?.clientId) return

    useHead({
      script: [{
        key: 'auth-utils-oauth-hash',
        tagPriority: 'critical',
        innerHTML: 'if(window.location.hash==="#_=_"){history.replaceState?history.replaceState(null,null,window.location.href.split("#")[0]):window.location.hash=""}',
      }],
    })
  },
})
