import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  await setUserSession(event, { loggedInAt: Date.now() })

  return getUserSession(event)
})
