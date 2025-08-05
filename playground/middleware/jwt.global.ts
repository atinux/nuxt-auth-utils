import { appendResponseHeader } from 'h3'
import { parse, parseSetCookie, serialize } from 'cookie-es'
import type { JWSVerifyResult, JWTClaims } from 'unjwt'
import { jws } from 'unjwt'

export default defineNuxtRouteMiddleware(async () => {
  const nuxtApp = useNuxtApp()
  // Don't run on client hydration when server rendered
  if (import.meta.client && nuxtApp.isHydrating && nuxtApp.payload.serverRendered) return

  const { session, clear: clearSession, fetch: fetchSession } = useUserSession()
  // Ignore if no tokens
  if (!session.value?.jwt) return

  const serverEvent = useRequestEvent()
  const runtimeConfig = useRuntimeConfig()
  const { accessToken, refreshToken } = session.value.jwt

  // For demo purposes only, use high entropy secrets or keys in production
  const accessTokenKey = new TextEncoder().encode(process.env.NUXT_SESSION_PASSWORD)
  const refreshTokenKey = new TextEncoder().encode(`${process.env.NUXT_SESSION_PASSWORD}-secret`)

  const [
    verifiedAccessToken,
    verifiedRefreshToken,
  ] = await Promise.all([
    jws.verify<JWTClaims>(accessToken, accessTokenKey),
    jws.verify<JWTClaims>(refreshToken, refreshTokenKey),
  ])

  // Both tokens expired, clearing session
  if (isExpired(verifiedAccessToken) && isExpired(verifiedRefreshToken)) {
    console.info('both tokens expired, clearing session')
    await clearSession()
    // return navigateTo('/login')
  }
  // Access token expired, refreshing
  else if (isExpired(verifiedAccessToken)) {
    console.info('access token expired, refreshing')
    await useRequestFetch()('/api/jwt/refresh', {
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
    // refresh the session
    await fetchSession()
  }
})

function isExpired(payload: JWSVerifyResult<JWTClaims>) {
  return payload.payload?.exp && payload.payload.exp < (Date.now() / 1000)
}
