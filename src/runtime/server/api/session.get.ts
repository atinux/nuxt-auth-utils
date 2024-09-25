import { eventHandler } from 'h3'
import { getUserSession, sessionHooks } from '../utils/session'
import type { UserSessionRequired } from '#auth-utils'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)

  // If session is not empty, call fetch hook
  if (Object.keys(session).length > 0) {
    await sessionHooks.callHookParallel('fetch', session as UserSessionRequired, event)
  }

  const { secure, ...data } = session

  return data
})
