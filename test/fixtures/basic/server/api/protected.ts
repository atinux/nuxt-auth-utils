import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  return { user }
})
