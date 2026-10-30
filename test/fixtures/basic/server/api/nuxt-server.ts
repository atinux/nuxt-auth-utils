import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  await setUserSession(event, { user: { fromNuxtServer: true } })

  return getUserSession(event)
})
