import type { H3Event } from 'h3'
// From `@nuxt/schema` (a dependency) instead of `nuxt/server`, so it resolves on Nuxt < 4.6
import type { RequestEvent } from '@nuxt/schema'

export type { RequestEvent }

export type SessionEvent = H3Event | RequestEvent
