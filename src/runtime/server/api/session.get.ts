import { defineEventHandler, getCookie } from 'nuxt/server'
import { getUserSession, sessionHooks } from '../utils/session'
import { resolveSessionConfig } from '../lib/session'

export default defineEventHandler(async (event) => {
  // Reading the session creates one when the request has no session cookie: answer anonymous visitors without setting a cookie
  if (!getCookie(event, resolveSessionConfig().name)) {
    return {}
  }

  const session = await getUserSession(event)

  // If session is not empty, call fetch hook
  if (Object.keys(session).length > 0) {
    await sessionHooks.callHookParallel('fetch', session, event)
  }

  const { secure, ...data } = session

  return data
})
