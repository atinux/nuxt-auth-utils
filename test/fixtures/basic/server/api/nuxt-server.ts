import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  await setUserSession(event, { fromNuxtServer: true })

  return getUserSession(event)
})
