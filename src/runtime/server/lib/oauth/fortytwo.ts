import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, setCookie, getCookie } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthFortyTwoConfig {
  /**
   * FortyTwo OAuth Client ID.
   * Defaults to `process.env.NUXT_OAUTH_FORTYTWO_CLIENT_ID`.
   */
  clientId?: string
  /**
   * FortyTwo OAuth Client Secret.
   * Defaults to `process.env.NUXT_OAUTH_FORTYTWO_CLIENT_SECRET`.
   */
  clientSecret?: string
  /**
   * Scopes requested from the FortyTwo API.
   * @default ['public']
   * @see https://api.intra.42.fr/apidoc/oauth#scopes
   * @example ['public', 'profile']
   */
  scope?: string[]
  /**
   * The authorization URL for FortyTwo OAuth.
   * @default 'https://api.intra.42.fr/oauth/authorize'
   */
  authorizationURL?: string
  /**
   * The token exchange URL for FortyTwo OAuth.
   * @default 'https://api.intra.42.fr/oauth/token'
   */
  tokenURL?: string
  /**
   * The base URL for the FortyTwo API (used to fetch user data).
   * @default 'https://api.intra.42.fr/v2'
   */
  apiURL?: string
  /**
   * Override the automatically determined redirect URL for the OAuth callback.
   * Useful in specific deployment environments where the public hostname might not be correctly inferred.
   * Defaults to `process.env.NUXT_OAUTH_FORTY_TWO_REDIRECT_URL` or derived from the request.
   */
  redirectURL?: string
}

// ULTRA-generic user interface.
// This is the minimum to avoid type errors on, for example, `user.id`.
interface FortyTwoUser {
  id: number
  login: string
  email: string

  // To prevent TypeScript from complaining if you access other fields
  // that the 42 API returns, but which you don't want to type here:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface FortyTwoTokens {
  access_token: string
  token_type: string
  expires_in: number
  scope: string // Space-separated string of granted scopes
  created_at: number
}

const COOKIE_NAME = 'nuxt_oauth_fortytwo_state'

export function defineOAuthFortyTwoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthFortyTwoConfig, { user: FortyTwoUser, tokens: FortyTwoTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.fortytwo, {
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      apiURL: 'https://api.intra.42.fr/v2',
      scope: ['public'],
    }) as OAuthFortyTwoConfig

    const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `FortyTwo login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'fortytwo', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      const state = randomUUID()
      setCookie(event, COOKIE_NAME, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 5, // Cookie expires in 5 minutes (for state validation)
        sameSite: 'lax',
      })

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          response_type: 'code',
          state, // Include the generated state
        }),
      )
    }

    const storedState = getCookie(event, COOKIE_NAME)
    if (!query.state || query.state !== storedState) {
      const error = createError({
        statusCode: 403,
        message: 'Invalid state parameter for FortyTwo OAuth. Possible CSRF attack or expired session.',
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokens = await requestAccessToken<FortyTwoTokens>(config.tokenURL as string, {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
        state: query.state, // Send state back for validation by some providers, though 42 might not strictly require it in the token request
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'fortytwo', tokens, onError)
    }

    const accessToken = tokens.access_token

    const user: FortyTwoUser = await $fetch<FortyTwoUser>(`${config.apiURL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
