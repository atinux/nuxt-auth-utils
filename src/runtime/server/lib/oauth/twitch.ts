import type { H3Event } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
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
}

export function twitchEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthTwitchConfig>) {
  return eventHandler(async (event: H3Event) => {
    // @ts-expect-error
    config = defu(config, useRuntimeConfig(event).oauth?.twitch, {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      authorizationParams: {},
    }) as OAuthTwitchConfig
    const { code } = getQuery(event)

    if (!config.clientId) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_TWITCH_CLIENT_ID env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectUrl = getRequestURL(event).href
    if (!code) {
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
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    const tokens: any = await ofetch(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
          grant_type: 'authorization_code',
          redirect_uri: parsePath(redirectUrl).pathname,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
        },
      },
    ).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Twitch login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    const users: any = await ofetch('https://api.twitch.tv/helix/users', {
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
