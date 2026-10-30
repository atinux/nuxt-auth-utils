import { defineEventHandler } from 'h3'

// h3 handler: h3 v1 on Nuxt 4, through the h3 v1 compatibility layer on Nuxt 5
export default defineEventHandler(async (event) => {
  await setUserSession(event, { user: { fromH3: true } })

  return getUserSession(event)
})
