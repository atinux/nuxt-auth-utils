import type { RequestEvent } from 'nuxt/server'
import type { IncomingMessage, ServerResponse } from 'node:http'

export type { RequestEvent }

/**
 * The h3 v1 event a handler defined with `defineEventHandler` from `h3` (or its auto-import) receives on Nuxt 4.
 * @deprecated Use `defineEventHandler` from `nuxt/server`. Removed with Nuxt 5 support.
 */
export interface LegacyH3Event {
  node: {
    req: IncomingMessage
    res: ServerResponse
  }
}

/**
 * A WebSocket peer or upgrade request, from `defineWebSocketHandler`.
 * The session is read-only: changes are not sent back to the client.
 */
export type WebSocketSessionEvent = { request: { headers: Headers } } | { headers: Headers }

/**
 * Any event the session utils accept.
 */
export type SessionEvent = RequestEvent | LegacyH3Event | WebSocketSessionEvent
