import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleInvalidState, handleMissingConfiguration, handlePkceVerifier, handleState, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

/**
 * Cloudflare OAuth provider — Authorization Code flow (the only flow Cloudflare supports).
 *
 * References:
 * - Endpoints:  https://developers.cloudflare.com/fundamentals/oauth/integrate-with-cloudflare/
 * - Flow/PKCE:  https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/#supported-oauth-flows
 * - Scopes:     https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/#select-scopes
 *
 * Scopes are dot-notation API-permission names (e.g. `workers-platform.read`) fetched from
 * `GET /client/v4/oauth/scopes` — `openid` is NOT a Cloudflare scope. PKCE (S256) is required
 * for public clients (auth method `none`) and optional for confidential clients (client secret).
 */

export interface OAuthCloudflareConfig {
  /**
   * Cloudflare OAuth Client ID
   * @default process.env.NUXT_OAUTH_CLOUDFLARE_CLIENT_ID
   */
  clientId?: string
  /**
   * Cloudflare OAuth Client Secret
   * @default process.env.NUXT_OAUTH_CLOUDFLARE_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Cloudflare OAuth scopes — dot-notation API token permission IDs from
   * `GET /client/v4/oauth/scopes`, matching the scopes the client was registered with.
   * Cloudflare requires at least one; there is no default (`openid` is not a Cloudflare scope).
   * @see https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/#select-scopes
   * @example ['workers-platform.read']
   */
  scope?: string[]
  /**
   * Cloudflare OAuth Authorization URL
   * @default 'https://dash.cloudflare.com/oauth2/auth'
   */
  authorizationURL?: string
  /**
   * Cloudflare OAuth Token URL
   * @default 'https://dash.cloudflare.com/oauth2/token'
   */
  tokenURL?: string
  /**
   * Cloudflare OIDC userinfo URL. Returns standard claims (`sub`, `iss`, `aud`, …);
   * use `GET /client/v4/user` for email/name.
   * @default 'https://dash.cloudflare.com/oauth2/userinfo'
   */
  userURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_CLOUDFLARE_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

/**
 * Claims returned by Cloudflare's `/oauth2/userinfo` endpoint. `sub` is the stable
 * Cloudflare user ID; the rest are standard OIDC token claims. There is no email/name
 * here — for richer profile data call `GET /client/v4/user` with the access token.
 */
export interface CloudflareUser {
  /** Stable Cloudflare user ID. */
  sub: string
  aud?: string[]
  iss?: string
  iat?: number
  auth_time?: number
  rat?: number
}

export interface CloudflareTokens {
  access_token: string
  token_type: string
  expires_in: number
  /** Present when scope includes `offline_access` */
  refresh_token?: string
  /** Present when scope includes `openid` */
  id_token?: string
  scope: string
}

export function defineOAuthCloudflareEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthCloudflareConfig, { user: CloudflareUser, tokens: CloudflareTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.cloudflare, {
      authorizationURL: 'https://dash.cloudflare.com/oauth2/auth',
      tokenURL: 'https://dash.cloudflare.com/oauth2/token',
      userURL: 'https://dash.cloudflare.com/oauth2/userinfo',
      authorizationParams: {},
    }) as OAuthCloudflareConfig

    const query = getQuery<{ code?: string, error?: string, error_description?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Cloudflare login failed: ${query.error_description || query.error}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'cloudflare', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)
    // PKCE (S256) is supported and recommended by Cloudflare even for confidential clients.
    const pkce = await handlePkceVerifier(event)

    if (!query.code) {
      // Cloudflare requires ≥1 scope (a dot-notation API permission); there is no universal
      // default, so send exactly what's configured and omit the param when none is set.
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope?.length ? config.scope.join(' ') : undefined,
          state,
          code_challenge: pkce.code_challenge,
          code_challenge_method: pkce.code_challenge_method,
          ...config.authorizationParams,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'cloudflare', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
        code_verifier: pkce.code_verifier,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'cloudflare', tokens, onError)
    }

    const user = await $fetch<CloudflareUser>(config.userURL as string, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
