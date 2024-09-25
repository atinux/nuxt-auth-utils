import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthInstagramConfig {
  /**
   * Instagram OAuth Client ID
   * @default process.env.NUXT_OAUTH_INSTAGRAM_CLIENT_ID
   */
  clientId?: string
  /**
   * Instagram OAuth Client Secret
   * @default process.env.NUXT_OAUTH_INSTAGRAM_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Instagram OAuth Scope
   * @default [ 'user_profile' ]
   * @see https://developers.facebook.com/docs/instagram-basic-display-api/overview#permissions
   * @example [ 'user_profile', 'user_media' ],
   */
  scope?: string[]

  /**
   * Instagram OAuth User Fields
   * @default [ 'id', 'username'],
   * @see https://developers.facebook.com/docs/instagram-basic-display-api/reference/user#fields
   * @example [ 'id', 'username', 'account_type', 'media_count' ],
   */
  fields?: string[]

  /**
   * Instagram OAuth Authorization URL
   * @default 'https://api.instagram.com/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * Instagram OAuth Token URL
   * @default 'https://api.instagram.com/oauth/access_token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_INSTAGRAM_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthInstagramEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthInstagramConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.instagram, {
      scope: ['user_profile'],
      authorizationURL: 'https://api.instagram.com/oauth/authorize',
      tokenURL: 'https://api.instagram.com/oauth/access_token',
      authorizationParams: {},
    }) as OAuthInstagramConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Instagram login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId) {
      return handleMissingConfiguration(event, 'instagram', ['clientId'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      // Redirect to Instagram Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          response_type: 'code',
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
      return handleAccessTokenErrorResponse(event, 'instagram', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing

    config.fields = config.fields || ['id', 'username']
    const fields = config.fields.join(',')

    const user = await $fetch(
      `https://graph.instagram.com/v20.0/me?fields=${fields}&access_token=${accessToken}`,
    )

    if (!user) {
      throw new Error('Instagram login failed: no user found')
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
