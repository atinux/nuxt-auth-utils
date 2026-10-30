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
  // Same cookie name as the module: `nuxt-session` is reserved for `useSession()` from `nuxt/server`
  const configuredName = useRuntimeConfig().session?.name
  const sessionName = configuredName && configuredName !== 'nuxt-session' ? configuredName : 'nuxt-auth-session'
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
          // Nitro 3 events have web request and response headers, Nitro 2 (h3 v1) events the Node.js ones
          const { req, res } = serverEvent as unknown as {
            req: { headers: Headers | Record<string, string | string[] | undefined> }
            res: { headers?: Headers, appendHeader?: (name: string, value: string) => void }
          }
          for (const setCookie of headers.getSetCookie()) {
            if (res.headers) res.headers.append('set-cookie', setCookie)
            else res.appendHeader?.('set-cookie', setCookie)
            // Update the session cookie of the request, for the next fetch requests
            const { name, value } = parseSetCookie(setCookie)
            if (name === sessionName) {
              const cookies = parse(String((req.headers instanceof Headers ? req.headers.get('cookie') : req.headers.cookie) || ''))
              // set or overwrite existing cookie
              cookies[name] = value
              const cookie = Object.entries(cookies).map(([name, value]) => serialize(name, value)).join('; ')
              if (req.headers instanceof Headers) req.headers.set('cookie', cookie)
              else req.headers.cookie = cookie
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
