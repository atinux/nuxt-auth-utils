import { defineEventHandler } from 'nuxt/server'
import { clearUserSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  await clearUserSession(event)

  return { loggedOut: true }
})
