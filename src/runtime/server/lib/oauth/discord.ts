import type { H3Event, EventHandler } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parseURL, stringifyParsedURL } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthAccessTokenError, OAuthAccessTokenSuccess, OAuthConfig, OAuthToken } from '#auth-utils'

/**
 * @see https://discord.com/developers/docs/resources/user#user-object
 */
type DiscordUser = {
  id: string
  discriminator: string
  username: string
  avatar: string
  email?: string
}

function normalizeDiscordUser(user: DiscordUser) {
  return {
    id: user.id,
    nickname: user.username,
    avatar: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${
            user.avatar.startsWith('a_') ? 'gif' : 'png'
          }`
      : `https://cdn.discordapp.com/embed/avatars/${user.discriminator === '0' ? (Number(user.id) >> 22) % 6 : Number(user.discriminator) % 5}.png`,
    email: user.email,
    raw: user,
  }
}

function normalizeDiscordTokens(tokens: OAuthAccessTokenSuccess): OAuthToken {
  return {
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    approvedScopes: tokens.scope?.split(' '),
  }
}

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

export function oauthDiscordEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthDiscordConfig, DiscordUser>): EventHandler {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.discord, {
      authorizationURL: 'https://discord.com/oauth2/authorize',
      tokenURL: 'https://discord.com/api/oauth2/token',
      profileRequired: true,
      authorizationParams: {},
    }) as OAuthDiscordConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_DISCORD_CLIENT_ID or NUXT_OAUTH_DISCORD_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
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

    const parsedRedirectUrl = parseURL(redirectURL)
    parsedRedirectUrl.search = ''
    const tokens = await $fetch<unknown>(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: stringifyParsedURL(parsedRedirectUrl),
          code: code as string,
        }).toString(),
      },
    )
    if ((tokens as OAuthAccessTokenError).error) {
      const error = createError({
        statusCode: 401,
        message: `Discord login failed: ${(tokens as OAuthAccessTokenError).error || 'Unknown error'}`,
        data: tokens as OAuthAccessTokenError,
      })

      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = (tokens as OAuthAccessTokenSuccess).access_token
    const user: DiscordUser = await $fetch('https://discord.com/api/users/@me', {
      headers: {
        'user-agent': 'Nuxt Auth Utils',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user: normalizeDiscordUser(user),
      tokens: normalizeDiscordTokens(tokens as OAuthAccessTokenSuccess),
    })
  })
}
