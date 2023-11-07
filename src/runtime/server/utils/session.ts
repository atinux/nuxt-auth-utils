import type { H3Event } from 'h3'
import { useSession, createError } from 'h3'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { default as UserSessionFactory } from '#auth-utils-session'
type UserSession = ReturnType<typeof UserSessionFactory>

export const defineSession = <T extends Record<string, unknown> & { user?: unknown }>(definition: (event: H3Event, result: { provider: string, user: any, tokens: any }) => T) => definition

export async function getUserSession (event: H3Event) {
  return (await _useSession(event)).data as UserSession
}
/**
 * Set a user session
 * @param event
 * @param data User session data, please only store public information since it can be decoded with API calls
 */
export async function setUserSession (event: H3Event, data: UserSession) {
  const session = await _useSession(event)

  await session.update(defu(data, session.data))

  return session.data as UserSession
}

export async function clearUserSession (event: H3Event) {
  const session = await _useSession(event)

  await session.clear()

  return true
}

export async function requireUserSession(event: H3Event) {
  const userSession = await getUserSession(event)

  if (!userSession.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  return userSession
}

let sessionConfig: any

function _useSession (event: H3Event) {
  if (!sessionConfig) {
    // @ts-ignore
    sessionConfig = defu({ password: process.env.NUXT_SESSION_PASSWORD }, useRuntimeConfig(event).session)
  }
  return useSession(event, sessionConfig)
}
