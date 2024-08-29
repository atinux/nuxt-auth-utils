import type { H3Event } from 'h3'
import {
  eventHandler,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { handleAccessTokenErrorResponse, handleMissingConfiguration } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthGoogleConfig {
  /**
   * Google OAuth Client ID
   * @default process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID
   */
  clientId?: string

  /**
   * Google OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Google OAuth Scope
   * @default []
   * @see https://developers.google.com/identity/protocols/oauth2/scopes#google-sign-in
   * @example ['email', 'openid', 'profile']
   */
  scope?: string[]

  /**
   * Google OAuth Authorization URL
   * @default 'https://accounts.google.com/o/oauth2/v2/auth'
   */
  authorizationURL?: string

  /**
   * Google OAuth Token URL
   * @default 'https://oauth2.googleapis.com/token'
   */
  tokenURL?: string

  /**
   * Google OAuth User URL
   * @default 'https://www.googleapis.com/oauth2/v3/userinfo'
   */
  userURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.google.com/identity/protocols/oauth2/web-server#httprest_3
   * @example { access_type: 'offline' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_GOOGLE_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthGoogleEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthGoogleConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.google, {
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
      authorizationParams: {},
    }) as OAuthGoogleConfig
    const { code } = getQuery(event)

    if (!config.clientId) {
      return handleMissingConfiguration(event, 'google', ['clientId'], onError)
    }

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || ['email', 'profile']
      // Redirect to Google Oauth page
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

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      grant_type: 'authorization_code',
      redirect_uri: parsePath(redirectURL).pathname,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(config.tokenURL as string, {
      method: 'POST',
      body,
    }).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'google', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(
      config.userURL as string,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
