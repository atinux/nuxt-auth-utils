import { defineEventHandler, readBody } from 'nuxt/server'

type UserSessionData = Parameters<typeof setUserSession>[1]

export default defineEventHandler(async (event) => {
  const { session, config } = await readBody<{ session?: UserSessionData, config?: Parameters<typeof setUserSession>[2] }>(event)

  return setUserSession(event, session || ({} as UserSessionData), config)
})
