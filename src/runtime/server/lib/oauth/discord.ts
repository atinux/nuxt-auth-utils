import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthDiscordConfig {
  /**
   * Discord OAuth Client ID
   * @default process.env.NUXT_OAUTH_DISCORD_CLIENT_ID
   */
  clientId?: string
  /**
   * Discord OAuth Client Secret
   * @default process.env.NUXT_OAUTH_DISCORD_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Discord OAuth Scope
   * @default []
   * @see https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes
   * @example ['identify', 'email']
   * Without the identify scope the user will not be returned.
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present.
   * @default false
   */
  emailRequired?: boolean
  /**
   * Require profile from user, adds the ['identify'] scope if not present.
   * @default true
   */
  profileRequired?: boolean
  /**
   * Discord OAuth Authorization URL
   * @default 'https://discord.com/oauth2/authorize'
   */
  authorizationURL?: string
  /**
   * Discord OAuth Token URL
   * @default 'https://discord.com/api/oauth2/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see 'https://discord.com/developers/docs/topics/oauth2#authorization-code-grant'
   * @example { allow_signup: 'true' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_DISCORD_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthDiscordEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthDiscordConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.discord, {
      authorizationURL: 'https://discord.com/oauth2/authorize',
      tokenURL: 'https://discord.com/api/oauth2/token',
      profileRequired: true,
      authorizationParams: {},
    }) as OAuthDiscordConfig
    const query = getQuery<{ code?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'discord', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }
      if (config.profileRequired && !config.scope.includes('identify')) {
        config.scope.push('identify')
      }

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
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://discord.com/api/users/@me', {
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
