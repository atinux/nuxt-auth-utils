import { eventHandler } from 'h3'
import { requireUserSession } from '../utils/session'

export default eventHandler(async (event) => {
  return await requireUserSession(event)
})
