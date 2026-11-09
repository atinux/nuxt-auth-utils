import { createError, defineEventHandler, getRequestHeader } from 'nuxt/server'

const calls = new Map<string, number>()

// Lets tests fail some user session requests of a page render: `x-fail-session` lists the failing calls, starting at 1
export default defineEventHandler(async (event) => {
  const failing = getRequestHeader(event, 'x-fail-session')
  if (event.path !== '/api/_auth/session' || !failing) return

  const renderId = getRequestHeader(event, 'x-render-id') ?? ''
  const call = (calls.get(renderId) ?? 0) + 1
  calls.set(renderId, call)
  if (failing.split(',').includes(String(call))) {
    // Fail slowly, so that a newer request can finish first
    await new Promise(resolve => setTimeout(resolve, 200))
    throw createError({ statusCode: 503, message: 'Session unavailable' })
  }
})
