import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'
import type { H3Event } from 'h3'

export default defineNitroPlugin(async (_nitroApp) => {
  let getNitroOrigin: ((event: H3Event) => string) | undefined

  try {
    // @ts-expect-error the package is optional
    const siteConfigComp = await import('#site-config/server/composables')
    getNitroOrigin = siteConfigComp.getNitroOrigin
  }
  catch {
    // We can safely ignore it because site config is not rewuired
  }

  _nitroApp.hooks.hook('request', (event) => {
    event.context.__authUtilsSiteConfig = { getNitroOrigin }
  })
})
