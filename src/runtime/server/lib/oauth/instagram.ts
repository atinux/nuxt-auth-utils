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
   * @required [ 'business_basic' ]
   * @see https://developers.facebook.com/docs/instagram-basic-display-api/overview#permissions
   * @example [ 'business_basic', 'business_manage_messages' ],
   */
  scope?: ('business_basic' | 'business_content_publish' | 'business_manage_comments' | 'business_manage_messages')[]

  /**
   * Instagram OAuth User Fields
   * @default [ 'id', 'username'],
   * @see https://developers.facebook.com/docs/instagram-basic-display-api/reference/user#fields
   * @example [ 'id', 'username', 'user_id', 'account_type', 'profile_picture_url' ],
   */
  fields?: ('id' | 'user_id' | 'username' | 'name' | 'account_type' | 'profile_picture_url' | 'followers_count' | 'follows_count' | 'media_count')[]

  /**
   * Instagram OAuth Authorization URL
   * @default 'https://www.instagram.com/oauth/authorize'
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
      scope: ['business_basic'],
      authorizationURL: 'https://www.instagram.com/oauth/authorize',
      tokenURL: 'https://api.instagram.com/oauth/access_token',
      authorizationParams: {},
    }) as OAuthInstagramConfig

    const query = getQuery<{
      code?: string
      error?: string
      error_reason?: string
      error_description?: string
    }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Instagram login failed: ${query.error || 'Unknown error'}`,
        data: {
          error: query.error,
          error_reason: query.error_reason,
          error_description: query.error_description,
        },
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
          scope: config.scope.join(),
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
    const fields = config.fields.join()

    const user = await $fetch(
      `https://graph.instagram.com/v21.0/me?fields=${fields}&access_token=${accessToken}`,
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
