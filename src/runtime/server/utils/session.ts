import type { RequestEvent, SessionConfig } from 'nuxt/server'
import { createError, defineEventHandler, useSession } from 'nuxt/server'
import { defu } from 'defu'
import { createHooks } from 'hookable'
import type { OmitWithIndexSignature } from '../../types/utils'
import { resolveSessionConfig } from '../lib/session'
import type { LegacyH3Event, SessionEvent, UserSession, UserSessionRequired } from '#auth-utils'

export { USER_SESSION_COOKIE_NAME } from '../lib/session'

type UserSessionData = OmitWithIndexSignature<UserSession, 'id'>

/**
 * Session options, the session is always sealed with a secret derived from `appSecret`.
 */
type UserSessionConfig = Omit<SessionConfig, 'password'>

/**
 * An event the session can be written with, WebSocket peers and upgrade requests are read-only.
 */
type WritableSessionEvent = RequestEvent | LegacyH3Event

/**
 * The part of the event the session helpers of `nuxt/server` read and write.
 */
type SessionRequestEvent = Pick<RequestEvent, 'req' | 'res'>

export interface SessionHooks {
  /**
   * Called when fetching the session from the API
   * - Add extra properties to the session
   * - Throw an error if the session could not be verified (with a database for example)
   */
  fetch: (session: UserSession, event: RequestEvent) => void | Promise<void>
  /**
   * Called before clearing the session
   */
  clear: (session: UserSession, event: RequestEvent) => void | Promise<void>
}

export const sessionHooks = createHooks<SessionHooks>()

/**
 * Get the user session from the current request
 * @param event The request event
 * @returns The user session
 */
export async function getUserSession(event: SessionEvent): Promise<UserSession> {
  const session = await _useSession(event)
  // A deep copy: changes to the returned session, nested ones included, are not stored by the next write
  return {
    ...structuredClone(session.data),
    id: session.id,
  }
}

/**
 * Set a user session
 * @param event The request event
 * @param data User session data, please only store public information since it can be decoded with API calls
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export async function setUserSession(event: WritableSessionEvent, data: UserSessionData, config?: UserSessionConfig): Promise<UserSession> {
  const session = await _useSession(event, config, true)

  await session.update(defu(toJSONData(data), session.data))

  return session.data as UserSession
}

/**
 * Replace a user session
 * @param event The request event
 * @param data User session data, please only store public information since it can be decoded with API calls
 */
export async function replaceUserSession(event: WritableSessionEvent, data: UserSessionData, config?: UserSessionConfig): Promise<UserSession> {
  const session = await _useSession(event, config, true)

  // Replace the data in place: `clear()` would also generate a new session id
  await session.update((oldData) => {
    for (const key of Object.keys(oldData)) {
      Reflect.deleteProperty(oldData, key)
    }
    return toJSONData(data)
  })

  return session.data as UserSession
}

/**
 * Clear the user session and removing the session cookie
 * @param event The request event
 * @returns true if the session was cleared
 */
export async function clearUserSession(event: WritableSessionEvent, config?: UserSessionConfig): Promise<boolean> {
  const session = await _useSession(event, config, true)

  await sessionHooks.callHookParallel('clear', session.data as UserSession, toSessionEvent(event).event as RequestEvent)
  await session.clear()

  return true
}

/**
 * Require a user session, throw a 401 error if the user is not logged in
 * @param event
 * @param opts Options to customize the error message and status code
 * @param opts.status The status code to use for the error (defaults to 401)
 * @param opts.statusCode Deprecated, use `status`
 * @param opts.message The message to use for the error (defaults to Unauthorized)
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export async function requireUserSession(event: SessionEvent, opts: { status?: number, statusCode?: number, message?: string } = {}): Promise<UserSessionRequired> {
  const userSession = await getUserSession(event)

  if (!userSession.user) {
    const status = opts.status || opts.statusCode || 401
    const message = opts.message || 'Unauthorized'
    if (toSessionEvent(event).webSocket) {
      throw new Response(message, { status })
    }
    throw createError({ status, message })
  }

  return userSession as UserSessionRequired
}

async function _useSession(event: SessionEvent, config: UserSessionConfig = {}, write = false) {
  const { event: sessionEvent, webSocket } = toSessionEvent(event)
  if (write && webSocket) {
    throw createError({
      status: 500,
      message: '[nuxt-auth-utils] The user session is read-only in WebSocket handlers: `setUserSession`, `replaceUserSession` and `clearUserSession` need the event of an HTTP request.',
    })
  }
  return useSession<UserSessionData>(sessionEvent, resolveSessionConfig(config))
}

// The session is sealed as strict JSON: values such as `Date` are stored as their JSON form, as in v0.5
function toJSONData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

// Gives the event of an h3 v1 handler in the shape of a `nuxt/server` handler.
// On Nitro 2, `defineEventHandler` from `nuxt/server` wraps the h3 event in a portable proxy (cached per event).
// TODO: remove with Nuxt 5, where every event is web-standard
const toPortableEvent = defineEventHandler(event => event) as unknown as (event: unknown) => RequestEvent

function toSessionEvent(event: SessionEvent): { event: SessionRequestEvent, webSocket: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input = event as any
  // Event of a `nuxt/server` handler, or a web-standard event (h3 v2)
  if (input['~portable'] === true || typeof input.res?.headers?.append === 'function') {
    return { event: input, webSocket: false }
  }
  // Event of an h3 v1 handler (Nuxt 4)
  if (input.node?.req) {
    return { event: toPortableEvent(input), webSocket: false }
  }
  // WebSocket peer (`peer.request`) or upgrade request: the session is read-only
  const headers = input.request?.headers || input.headers
  if (headers && typeof headers.get === 'function') {
    return {
      event: {
        req: { headers } as Request,
        res: { status: 200, statusText: '', headers: new Headers() },
      },
      webSocket: true,
    }
  }
  throw createError({
    status: 500,
    message: '[nuxt-auth-utils] The session utils need a request event, a WebSocket peer or a WebSocket upgrade request.',
  })
}
