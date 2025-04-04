import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
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
  /**
   * State parameter to pass custom data through the OAuth flow
   * @default undefined
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
   */
  state?: string
}

export function defineOAuthFacebookEventHandler({
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

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Facebook login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'facebook', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = [...new Set(config.scope)]
      // Redirect to Facebook Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          ...(config.state !== undefined && { state: encodeURIComponent(JSON.stringify(config.state)) }),
          scope: config.scope.join(' '),
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
      return handleAccessTokenErrorResponse(event, 'facebook', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing

    config.fields = [...new Set(config.fields || ['id', 'name'])]
    const fields = config.fields.join(',')

    const user = await $fetch(
      `https://graph.facebook.com/v19.0/me?fields=${fields}&access_token=${accessToken}`,
    )

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Facebook user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
