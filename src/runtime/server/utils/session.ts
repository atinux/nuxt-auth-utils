import type { H3Event, SessionConfig } from 'h3'
import { useSession, createError, isEvent } from 'h3'
import { defu } from 'defu'
import { createHooks } from 'hookable'
import { useRuntimeConfig, useStorage } from '#imports'
import type { UserSession, UserSessionRequired } from '#auth-utils'

type UseSessionEvent = Parameters<typeof useSession>[0]

export interface SessionHooks {
  /**
   * Called when fetching the session from the API
   * - Add extra properties to the session
   * - Throw an error if the session could not be verified (with a database for example)
   */
  fetch: (session: UserSession, event: H3Event) => void | Promise<void>
  /**
   * Called before clearing the session
   */
  clear: (session: UserSession, event: H3Event) => void | Promise<void>
}

export const sessionHooks = createHooks<SessionHooks>()

/**
 * Get the user session from the current request
 * @param event The Request (h3) event
 * @returns The user session
 */
export async function getUserSession(event: UseSessionEvent) {
  return (await _useSession(event)).data
}
/**
 * Set a user session
 * @param event The Request (h3) event
 * @param data User session data, please only store public information since it can be decoded with API calls
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export async function setUserSession(event: H3Event, data: UserSession, config?: Partial<SessionConfig>) {
  const session = await _useSession(event, config)

  await session.update(defu(data, session.data))

  return session.data
}

/**
 * Replace a user session
 * @param event The Request (h3) event
 * @param data User session data, please only store public information since it can be decoded with API calls
 */
export async function replaceUserSession(event: H3Event, data: UserSession, config?: Partial<SessionConfig>) {
  const session = await _useSession(event, config)

  await session.clear()
  await session.update(data)

  return session.data
}

/**
 * Clear the user session and removing the session cookie
 * @param event The Request (h3) event
 * @returns true if the session was cleared
 */
export async function clearUserSession(event: H3Event, config?: Partial<SessionConfig>) {
  const session = await _useSession(event, config)

  await sessionHooks.callHookParallel('clear', session.data, event)
  await session.clear()
  await revokeSession(event, config)

  return true
}

/**
 * Require a user session, throw a 401 error if the user is not logged in
 * @param event
 * @param opts Options to customize the error message and status code
 * @param opts.statusCode The status code to use for the error (defaults to 401)
 * @param opts.message The message to use for the error (defaults to Unauthorized)
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export async function requireUserSession(event: UseSessionEvent, opts: { statusCode?: number, message?: string } = {}): Promise<UserSessionRequired> {
  const userSession = await getUserSession(event)

  if (!userSession.user) {
    if (isEvent(event)) {
      throw createError({
        statusCode: opts.statusCode || 401,
        message: opts.message || 'Unauthorized',
      })
    }
    else {
      throw new Response(opts.message || 'Unauthorized', {
        status: opts.statusCode || 401,
      })
    }
  }

  return userSession as UserSessionRequired
}

/**
 * Checks if a session has been revoked
 * @param event The Request (h3) event
 * @param config Optional partial session configuration
 * @returns A boolean indicating whether the session is revoked
 */
export async function isSessionRevoked(event: H3Event, config: Partial<SessionConfig> = {}) {
  const sessionRevocationStorage = useRuntimeConfig().sessionRevocationStorage
  if (!sessionRevocationStorage) {
    return false
  }
  const session = await _useSession(event, config)
  if (!session || !session.id) {
    return false
  }
  const store = useStorage(sessionRevocationStorage)
  return await store.get(session.id)
}

/**
 * Revokes a session
 * @param event The Request (h3) event
 * @param config Optional partial session configuration
 * @returns A boolean indicating whether the session was successfully revoked
 */
export async function revokeSession(event: H3Event, config: Partial<SessionConfig> = {}) {
  const sessionRevocationStorage = useRuntimeConfig().sessionRevocationStorage
  if (!sessionRevocationStorage) {
    console.log('No session revocation storage configured')
    return false
  }
  const session = await _useSession(event, config)
  if (!session || !session.id) {
    return false
  }
  const store = useStorage(sessionRevocationStorage)
  await store.set(session.id, Date.now())
  return true
}

/**
 * Lists all revoked sessions
 * @returns An array of revoked session keys
 */
export async function listRevokedSessions() {
  const sessionRevocationStorage = useRuntimeConfig().sessionRevocationStorage
  if (!sessionRevocationStorage) {
    return []
  }
  const store = useStorage(sessionRevocationStorage)
  return await store.getKeys()
}

/**
 * Clears all revoked sessions
 */
export async function clearRevokedSessions() {
  const sessionRevocationStorage = useRuntimeConfig().sessionRevocationStorage
  if (!sessionRevocationStorage) {
    return
  }
  const store = useStorage(sessionRevocationStorage)
  await store.clear()
}

/**
 * Cleans up expired revoked sessions
 * @param maxAge Optional maximum age for revoked sessions (in milliseconds)
 */
export async function cleanupRevokedSessions(maxAge?: number) {
  const sessionRevocationStorage = useRuntimeConfig().sessionRevocationStorage
  if (!sessionRevocationStorage) {
    return
  }
  const sessionMaxAge = useRuntimeConfig().session?.maxAge
  const revokedMaxAge = maxAge || sessionMaxAge
  if (!revokedMaxAge) {
    return
  }
  const store = useStorage(sessionRevocationStorage)
  const keys = await store.getKeys()
  for (const key of keys) {
    const revokedAt = await store.get<number>(key)
    if (revokedAt && ((Date.now() - revokedAt) > revokedMaxAge)) {
      await store.removeItem(key)
    }
  }
}

let sessionConfig: SessionConfig

function _useSession(event: UseSessionEvent, config: Partial<SessionConfig> = {}) {
  if (!sessionConfig) {
    const runtimeConfig = useRuntimeConfig(isEvent(event) ? event : undefined)
    const envSessionPassword = `${runtimeConfig.nitro?.envPrefix || 'NUXT_'}SESSION_PASSWORD`

    sessionConfig = defu({ password: process.env[envSessionPassword] }, runtimeConfig.session)
  }
  const finalConfig = defu(config, sessionConfig) as SessionConfig
  return useSession<UserSession>(event, finalConfig)
}
