import { defineNitroPlugin } from 'nitropack/runtime'
import { getUserSession } from '../utils/session'

export default defineNitroPlugin((nitroApp) => {
  // Init the session before the first WebSocket upgrade
  nitroApp.hooks.hook('request', async (event) => {
    await getUserSession(event)
  })
})
