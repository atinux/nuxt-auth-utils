import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthLineConfig {
  /**
   * Line OAuth Client ID
   * @default process.env.NUXT_OAUTH_LINE_CLIENT_ID
   */
  clientId?: string

  /**
   * Line OAuth Client Secret
   * @default process.env.NUXT_OAUTH_LINE_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Line OAuth Scope
   * @default ['profile', 'openid']
   * @see https://developers.line.biz/en/docs/line-login/integrate-line-login/
   */
  scope?: string[]

  /**
   * Line OAuth Authorization URL
   * @default 'https://access.line.me/oauth2/v2.1/authorize'
   */
  authorizationURL?: string

  /**
   * Line OAuth Token URL
   * @default 'https://api.line.me/oauth2/v2.1/token'
   */
  tokenURL?: string

  /**
   * Line OAuth User Info URL
   * @default 'https://api.line.me/v2/profile'
   */
  userURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @example { bot_prompt: 'normal' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_LINE_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthLineEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthLineConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.line, {
      authorizationURL: 'https://access.line.me/oauth2/v2.1/authorize',
      tokenURL: 'https://api.line.me/oauth2/v2.1/token',
      userURL: 'https://api.line.me/v2/profile',
      authorizationParams: {},
    }) as OAuthLineConfig

    const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Line login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'line', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    if (!query.code) {
      config.scope = config.scope || ['profile', 'openid']
      // Redirect to Line OAuth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state: query.state || '',
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        code: query.code as string,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'line', tokens, onError)
    }

    const accessToken = tokens.access_token
    const user = await $fetch(config.userURL as string, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Line user',
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
