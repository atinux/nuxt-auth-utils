import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
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
  /**
   * Optional static `state` value to include in the OAuth flow for CSRF protection.
   */
  state?: string
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
  refresh_token: string
  scope: string // Space-separated string of granted scopes
  created_at: number
  secret_valid_until: number
}

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

    if (!config.clientId || !config.clientSecret)
      return handleMissingConfiguration(event, 'fortytwo', ['clientId', 'clientSecret'], onError)

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code)
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope?.join(' '),
          state: query.state || '',
        }),
      )

    if (query.state !== config.state) {
      const error = createError({
        statusCode: 403,
        message: 'Invalid state parameter for FortyTwo OAuth. Possible CSRF attack.',
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
        state: query.state,
      },
    })

    if (tokens.error)
      return handleAccessTokenErrorResponse(event, 'fortytwo', tokens, onError)

    const user: FortyTwoUser = await $fetch<FortyTwoUser>(`${config.apiURL}/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, { user, tokens })
  })
}
