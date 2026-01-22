import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, handleState, handleInvalidState } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthOsuConfig {
  /**
   * osu! OAuth Client ID
   * @default process.env.NUXT_OAUTH_OSU_CLIENT_ID
   */
  clientId?: string

  /**
   * osu! OAuth Client Secret
   * @default process.env.NUXT_OAUTH_OSU_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * osu! OAuth Scope
   *
   * The identify scope is always implicitly provided.
   * @default []
   * @see https://osu.ppy.sh/docs/#scopes
   */
  scope?: string[]

  /**
   * osu! OAuth Authorization URL
   * @default 'https://osu.ppy.sh/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * osu! OAuth Token URL
   * @default 'https://osu.ppy.sh/oauth/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see 'https://osu.ppy.sh/docs/#authorization-code-grant'
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_OSU_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthOsuEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthOsuConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.osu, {
      authorizationURL: 'https://osu.ppy.sh/oauth/authorize',
      tokenURL: 'https://osu.ppy.sh/oauth/token',
      authorizationParams: {},
    }) as OAuthOsuConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'osu', ['clientId', 'clientSecret'], onError)
    }

    if (query.error) {
      return handleAccessTokenErrorResponse(event, 'osu', query, onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || []

      // Redirect to osu! OAuth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
          ...config.authorizationParams,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'osu', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'osu', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://osu.ppy.sh/api/v2/me', {
      headers: {
        'user-agent': 'Nuxt Auth Utils',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
