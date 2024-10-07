import { eventHandler } from 'h3'
import { getUserSession, sessionHooks } from '../utils/session'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)

  // If session is not empty, call fetch hook
  if (Object.keys(session).length > 0) {
    await sessionHooks.callHookParallel('fetch', session, event)
  }

  const { secure, ...data } = session

  return data
})
