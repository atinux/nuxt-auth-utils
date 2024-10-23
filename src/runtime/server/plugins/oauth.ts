import type { NitroApp } from 'nitropack'
import { defineNitroPlugin } from 'nitropack/runtime'
import { getUserSession, setUserSession } from '../utils/session'
import { useRuntimeConfig } from '#imports'

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const config = useRuntimeConfig()
  // update the session
  if (config.autoExtendSession) {
    nitroApp.hooks.hook('request', async (event) => {
      if (event.path === '/api/_auth/session') {
        return
      }

      const session = await getUserSession(event)
      if (session && Object.keys(session).length > 0) {
        await setUserSession(event, session)
      }
    })
  }

  if (
    (process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID && process.env.NUXT_OAUTH_FACEBOOK_CLIENT_SECRET)
    || (process.env.NUXT_OAUTH_INSTAGRAM_CLIENT_ID && process.env.NUXT_OAUTH_INSTAGRAM_CLIENT_SECRET)
  ) {
  // In facebook and instagram login, the url is redirected to /#_=_ which is not a valid route
  // so we remove it from the url, we are loading this long before the app is loaded
  // by using render:html hook
  // this is a hack, but it works
  // https://stackoverflow.com/questions/7131909/facebook-callback-appends-to-return-url
    nitroApp.hooks.hook('render:html', (html) => {
      html.head.unshift(`
      <script>
        if (window.location.hash === "#_=_"){
          history.replaceState
              ? history.replaceState(null, null, window.location.href.split("#")[0])
              : window.location.hash = "";
        }
      </script>
    `)
    })
  }
})
