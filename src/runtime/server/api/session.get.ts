import { defineEventHandler, getCookie } from 'nuxt/server'
import { getUserSession, sessionHooks } from '../utils/session'
import { resolveSessionConfig } from '../lib/session'
import type { UserSession } from '#auth-utils'

export default defineEventHandler(async (event) => {
  // Reading the session creates one when the request has no session cookie: answer anonymous visitors without setting a cookie
  if (!getCookie(event, resolveSessionConfig().name)) {
    return {}
  }

  const session: UserSession = await getUserSession(event)

  // If session is not empty, call fetch hook
  if (Object.keys(session).length > 0) {
    const stored = Object.fromEntries(Object.entries(session).map(([key, value]) => [key, JSON.stringify(value)]))
    await sessionHooks.callHookParallel('fetch', session, event)
    // `session` is a copy: also return the keys the hook wrote with `setUserSession` or `replaceUserSession`
    const latest = await getUserSession(event)
    for (const key of new Set([...Object.keys(stored), ...Object.keys(latest)])) {
      if (JSON.stringify(latest[key]) === stored[key]) continue
      if (key in latest) session[key] = latest[key]
      else Reflect.deleteProperty(session, key)
    }
  }

  const { secure, ...data } = session

  return data
})
