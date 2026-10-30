import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  await setUserSession(event, { user: { createdAt: new Date('2026-01-02T03:04:05.000Z') } })

  return getUserSession(event)
})
