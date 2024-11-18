import { eventHandler } from 'h3'
import { clearUserSession, revokeSession } from '../utils/session'

export default eventHandler(async (event) => {
  await clearUserSession(event)
  await revokeSession(event)

  return { loggedOut: true }
})
