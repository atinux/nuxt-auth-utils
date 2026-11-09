import { createError, defineEventHandler, getRequestHeader } from 'nuxt/server'

const calls = new Map<string, number>()

// Lets tests delay or fail user session requests of a page render.
// `x-delay-session` and `x-fail-session` list the calls, starting at 1; failing calls are delayed too
export default defineEventHandler(async (event) => {
  const delaying = getRequestHeader(event, 'x-delay-session')?.split(',') ?? []
  const failing = getRequestHeader(event, 'x-fail-session')?.split(',') ?? []
  if (event.path !== '/api/_auth/session' || (!delaying.length && !failing.length)) return

  const renderId = getRequestHeader(event, 'x-render-id') ?? ''
  const call = String((calls.get(renderId) ?? 0) + 1)
  calls.set(renderId, Number(call))
  if (delaying.includes(call) || failing.includes(call)) {
    // Answer slowly, so that a newer request can finish first
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  if (failing.includes(call)) {
    throw createError({ statusCode: 503, message: 'Session unavailable' })
  }
})
