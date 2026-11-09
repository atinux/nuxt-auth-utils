import type { RequestEvent } from 'nuxt/server'
import { createError, getRequestURL, useRuntimeConfig } from 'nuxt/server'

/**
 * Whether the module reads `x-forwarded-host` from the request.
 *
 * The host decides where the provider sends the user back, and a client can set the header when the proxy
 * doesn't strip it, so the module ignores it by default. Set `runtimeConfig.auth.trustForwardedHost`
 * (`NUXT_AUTH_TRUST_FORWARDED_HOST=true`) when the proxy rewrites `Host` to an internal address.
 *
 * `x-forwarded-proto` is read without this setting, as since #557: the scheme can't move the flow elsewhere.
 */
export function trustForwardedHost(): boolean {
  const configured = useRuntimeConfig().auth.trustForwardedHost as boolean | string
  // Nitro 3 keeps environment overrides as strings: `NUXT_AUTH_TRUST_FORWARDED_HOST=true` gives `'true'`
  return configured === true || configured === 'true'
}

/**
 * The URL the client reached the app on.
 *
 * The origin comes from `runtimeConfig.appURL` (`NUXT_APP_URL`) when it is set, and the path stays the one the
 * request was served on, so `app.baseURL` keeps working. Otherwise the origin comes from the request:
 * `x-forwarded-proto`, and `x-forwarded-host` when `trustForwardedHost()` allows it.
 *
 * Providers build their `redirect_uri` through `getOAuthRedirectURL()`, which returns the origin and the path
 * only: the query of the login request, such as the `instance` of `/auth/mastodon?instance=mastodon.social`,
 * must not end up in a registered callback URL.
 *
 * Development always uses the request, so a production app URL doesn't affect local logins.
 */
export function getPublicRequestURL(event: RequestEvent): URL {
  const requestURL = getRequestURL(event, { xForwardedProto: true, xForwardedHost: trustForwardedHost() })
  const appURL = import.meta.dev ? '' : useRuntimeConfig().appURL

  if (!appURL) {
    return requestURL
  }

  const origin = parseAppURL(appURL)

  if (!origin) {
    // Falling back to the request host here would silently ignore the configured origin
    throw createError({
      status: 500,
      message: `Invalid app URL "${appURL}": set \`runtimeConfig.appURL\` (\`NUXT_APP_URL\`) to an absolute http(s) URL, such as "https://example.com". The path comes from the request.`,
    })
  }

  // Only the origin is used, the path is the one the request was served on
  return new URL(`${requestURL.pathname}${requestURL.search}`, origin)
}

/**
 * The origin of a configured app URL, or `undefined` when it is not an absolute `http(s)` URL.
 *
 * A relative or malformed value must not resolve to a bogus origin, and neither must a scheme a browser
 * cannot open, such as `ftp://example.com`.
 */
function parseAppURL(appURL: string): URL | undefined {
  try {
    const origin = new URL(appURL)

    return origin.protocol === 'http:' || origin.protocol === 'https:' ? origin : undefined
  }
  catch {
    return undefined
  }
}
