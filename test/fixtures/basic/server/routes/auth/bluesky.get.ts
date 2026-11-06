import { defineEventHandler } from 'nuxt/server'

// Stands in for a login route: returns the client metadata the login flow computes,
// so a test can compare it with the document the module publishes.
export default defineEventHandler((event) => {
  return getAtprotoClientMetadata(event, 'bluesky')
})
