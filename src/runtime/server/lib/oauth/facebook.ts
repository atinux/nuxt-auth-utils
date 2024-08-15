import type { H3Event } from 'h3'
import {
  eventHandler,
  createError,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthFacebookConfig {
  /**
   * Facebook OAuth Client ID
   * @default process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID
   */
  clientId?: string
  /**
   * Facebook OAuth Client Secret
   * @default process.env.NUXT_OAUTH_FACEBOOK_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Facebook OAuth Scope
   * @default []
   * @see https://developers.facebook.com/docs/permissions
   * @example [ 'email' ],
   */
  scope?: string[]

  /**
   * Facebook OAuth User Fields
   * @default [ 'id', 'name'],
   * @see https://developers.facebook.com/docs/graph-api/guides/field-expansion
   * @example [ 'id', 'name', 'email' ],
   */
  fields?: string[]

  /**
   * Facebook OAuth Authorization URL
   * @default 'https://www.facebook.com/v19.0/dialog/oauth'
   */
  authorizationURL?: string

  /**
   * Facebook OAuth Token URL
   * @default 'https://graph.facebook.com/v19.0/oauth/access_token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_FACEBOOK_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthFacebookEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthFacebookConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.facebook, {
      authorizationURL: 'https://www.facebook.com/v19.0/dialog/oauth',
      tokenURL: 'https://graph.facebook.com/v19.0/oauth/access_token',
      authorizationParams: {},
    }) as OAuthFacebookConfig
    const query = getQuery(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Facebook login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId) {
      const error = createError({
        statusCode: 500,
        message:
          'Missing NUXT_OAUTH_FACEBOOK_CLIENT_ID or NUXT_OAUTH_FACEBOOK_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!query.code) {
      config.scope = config.scope || []
      // Redirect to Facebook Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
        }),
      )
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(config.tokenURL as string, {
      method: 'POST',
      body: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Facebook login failed: ${tokens.error || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing

    config.fields = config.fields || ['id', 'name']
    const fields = config.fields.join(',')

    const user = await $fetch(
      `https://graph.facebook.com/v19.0/me?fields=${fields}&access_token=${accessToken}`,
    )

    if (!user) {
      throw new Error('Facebook login failed: no user found')
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
