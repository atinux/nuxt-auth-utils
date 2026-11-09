import { createError, defineEventHandler, getRequestHeader } from 'nuxt/server'

// Lets tests make the user session request fail
export default defineEventHandler((event) => {
  if (event.path === '/api/_auth/session' && getRequestHeader(event, 'x-fail-session')) {
    throw createError({ statusCode: 503, message: 'Session unavailable' })
  }
})
