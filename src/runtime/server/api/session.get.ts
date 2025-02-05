import { eventHandler } from 'h3'
import { getUserSession, isSessionRevoked, clearUserSession, sessionHooks } from '../utils/session'
import { createError } from '#imports'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)

  // If session is not empty, call fetch hook
  if (Object.keys(session).length > 0) {
    if (await isSessionRevoked(event)) {
      await clearUserSession(event)
      throw createError({
        statusCode: 401,
        statusMessage: 'Session revoked',
      })
    }
    await sessionHooks.callHookParallel('fetch', session, event)
  }

  const { secure, ...data } = session

  return data
})
