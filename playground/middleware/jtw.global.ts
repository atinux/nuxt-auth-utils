import { appendResponseHeader } from 'h3'
import { parse, parseSetCookie, serialize } from 'cookie-es'
import type { JwtData } from '@tsndr/cloudflare-worker-jwt'
import { decode } from '@tsndr/cloudflare-worker-jwt'

export default defineNuxtRouteMiddleware(async (route) => {
  const nuxtApp = useNuxtApp()
  // Don't run on client hydration when server rendered
  if (import.meta.client && nuxtApp.isHydrating && nuxtApp.payload.serverRendered) return

  const serverEvent = useRequestEvent()
  const runtimeConfig = useRuntimeConfig()
  const { session, clear, fetch } = useUserSession()
  const { accessToken, refreshToken } = session.value?.jwt || {}
  // Ignore if no tokens
  if (!accessToken || !refreshToken) return

  const accessPayload = decode(accessToken)
  const refreshPayload = decode(refreshToken)

  // console.log(accessPayload, '\n', refreshPayload)
  // Both tokens expired, clearing session
  if (isExpired(accessPayload) && isExpired(refreshPayload)) {
    console.log('both tokens expired, clearing session')
    await clear()
    // return navigateTo('/login')
  }
  // Access token expired, refreshing
  else if (isExpired(accessPayload)) {
    console.log('access token expired, refreshing')
    await useRequestFetch()('/api/jtw/refresh', {
      method: 'POST',
      onResponse({ response: { headers } }) {
        // Forward the Set-Cookie header to the main server event
        if (import.meta.server && serverEvent) {
          for (const setCookie of headers.getSetCookie()) {
            appendResponseHeader(serverEvent, 'Set-Cookie', setCookie)
            // Update session cookie for next fetch requests
            const { name, value } = parseSetCookie(setCookie)
            if (name === runtimeConfig.session.name) {
              // console.log('updating headers.cookie to', value)
              const cookies = parse(serverEvent.headers.get('cookie') || '')
              // set or overwrite existing cookie
              cookies[name] = value
              // update cookie event header for future requests
              serverEvent.headers.set('cookie', Object.entries(cookies).map(([name, value]) => serialize(name, value)).join('; '))
              // Also apply to serverEvent.node.req.headers
              if (serverEvent.node?.req?.headers) {
                serverEvent.node.req.headers['cookie'] = serverEvent.headers.get('cookie') || ''
              }
            }
          }
        }
      },
    })
    await fetch()
  }
})

function isExpired(payload: JwtData) {
  return payload.payload?.exp && payload.payload.exp < (Date.now() / 1000)
}
