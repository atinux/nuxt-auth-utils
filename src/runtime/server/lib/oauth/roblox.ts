import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthRobloxConfig {
  /**
   * Roblox OAuth Client ID
   * @default process.env.NUXT_OAUTH_ROBLOX_CLIENT_ID
   */
  clientId?: string
  /**
   * Roblox OAuth Client Secret
   * @default process.env.NUXT_OAUTH_ROBLOX_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Roblox OAuth Scope
   * Some scopes and claims listed are only available to official Roblox apps, e.g. email
   * @default ['openid']
   * @see https://apis.roblox.com/oauth/.well-known/openid-configuration
   * @example ['openid', 'profile', 'asset:read', 'universe-messaging-service:publish']
   */
  scope?: string[]
  /**
   * Roblox OAuth Authorization URL
   * @default 'https://apis.roblox.com/oauth/v1/authorize'
   */
  authorizationURL?: string
  /**
   * Roblox OAuth Token URL
   * @default 'https://apis.roblox.com/oauth/v1/token'
   */
  tokenURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://create.roblox.com/docs/cloud/auth/oauth2-reference#get-v1authorize
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_ROBLOX_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export interface OAuthRobloxUser {
  /**
   * Roblox unique user ID 
   */
  sub: string

  /**
   * Display name (may be identical to username) - can be changed by the user
   * Available only with the profile scope
   */
  name?: string

  /**
   * Display name (may be identical to username) - can be changed by the user
   * Available only with the profile scope
   */
  nickname?: string

  /**
   * Unique username - can be changed by the user
   * Available only with the profile scope
   */
  preferred_username?: string

  /**
   * URL of the Roblox account profile
   * Available only with the profile scope
   */
  created_at?: string

  /**
   * Roblox avatar headshot image
   * Can be null if the avatar headshot image hasn't yet been generated or has been moderated
   * Available only with the profile scope
   */
  picture?: string | null
}

export function defineOAuthRobloxEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthRobloxConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.linear, {
      authorizationURL: 'https://apis.roblox.com/oauth/v1/authorize',
      tokenURL: 'https://apis.roblox.com/oauth/v1/token',
      authorizationParams: {},
    }) as OAuthRobloxConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'discord', ['clientId', 'clientSecret'], onError)
    }

    if (query.error) {
      return handleAccessTokenErrorResponse(event, 'discord', query, onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []

      // Redirect to Discord Oauth page
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
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'discord', tokens, onError)
    }

    const accessToken = tokens.access_token
    const user: OAuthRobloxUser = await $fetch('https://apis.roblox.com/oauth/userinfo', {
      headers: {
        'user-agent': 'Nuxt Auth Utils',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
}
