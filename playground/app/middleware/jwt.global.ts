import { parse, parseSetCookie, serialize } from 'cookie-es'
import type { JwtData } from '@tsndr/cloudflare-worker-jwt'
import { decode } from '@tsndr/cloudflare-worker-jwt'

export default defineNuxtRouteMiddleware(async () => {
  const nuxtApp = useNuxtApp()
  // Don't run on client hydration when server rendered
  if (import.meta.client && nuxtApp.isHydrating && nuxtApp.payload.serverRendered) return

  const { session, clear: clearSession, fetch: fetchSession } = useUserSession()
  // Ignore if no tokens
  if (!session.value?.jwt) return

  const serverEvent = useRequestEvent()
  const { accessToken, refreshToken } = session.value.jwt

  const accessPayload = decode(accessToken)
  const refreshPayload = decode(refreshToken)

  // Both tokens expired, clearing session
  if (isExpired(accessPayload) && isExpired(refreshPayload)) {
    console.info('both tokens expired, clearing session')
    await clearSession()
    // return navigateTo('/login')
  }
  // Access token expired, refreshing
  else if (isExpired(accessPayload)) {
    console.info('access token expired, refreshing')
    await useRequestFetch()('/api/jwt/refresh', {
      method: 'POST',
      onResponse({ response: { headers } }) {
        // Forward the Set-Cookie header to the main server event
        if (import.meta.server && serverEvent) {
          for (const setCookie of headers.getSetCookie()) {
            serverEvent.res.headers.append('set-cookie', setCookie)
            // Update the session cookie of the request, for the next fetch requests
            const { name, value } = parseSetCookie(setCookie)
            if (name === 'nuxt-auth-session') {
              const cookies = parse(serverEvent.req.headers.get('cookie') || '')
              // set or overwrite existing cookie
              cookies[name] = value
              serverEvent.req.headers.set('cookie', Object.entries(cookies).map(([name, value]) => serialize(name, value)).join('; '))
            }
          }
        }
      },
    })
    // refresh the session
    await fetchSession()
  }
})

function isExpired(payload: JwtData) {
  return payload.payload?.exp && payload.payload.exp < (Date.now() / 1000)
}
