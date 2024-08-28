import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthTwitchConfig {
  /**
   * Twitch Client ID
   * @default process.env.NUXT_OAUTH_TWITCH_CLIENT_ID
   */
  clientId?: string

  /**
   * Twitch OAuth Client Secret
   * @default process.env.NUXT_OAUTH_TWITCH_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Twitch OAuth Scope
   * @default []
   * @see https://dev.twitch.tv/docs/authentication/scopes
   * @example ['user:read:email']
   */
  scope?: string[]

  /**
   * Require email from user, adds the ['user:read:email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * Twitch OAuth Authorization URL
   * @default 'https://id.twitch.tv/oauth2/authorize'
   */
  authorizationURL?: string

  /**
   * Twitch OAuth Token URL
   * @default 'https://id.twitch.tv/oauth2/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow
   * @example { force_verify: 'true' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_TWITCH_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthTwitchEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthTwitchConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.twitch, {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      authorizationParams: {},
    }) as OAuthTwitchConfig

    const query = getQuery<{ code?: string }>(event)

    if (!config.clientId) {
      return handleMissingConfiguration(event, 'twitch', ['clientId'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('user:read:email')) {
        config.scope.push('user:read:email')
      }
      // Redirect to Twitch Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'twitch', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: any = await $fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': config.clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const user = users.data?.[0]

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Twitch user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
