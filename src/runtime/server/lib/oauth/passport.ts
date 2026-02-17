import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthPassportConfig {
  /**
   * Passport OAuth Client ID
   * @default process.env.NUXT_OAUTH_YANDEX_CLIENT_ID
   */
  clientId?: string

  /**
   * Passport OAuth Client Secret
   * @default process.env.NUXT_OAUTH_YANDEX_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Passport OAuth Scope
   * @default []
   */
  scope?: string[]

  /**
   * Passport OAuth Base URL
   * @default 'https://passport.laravel.com'
   */
  baseURL?: string

  /**
   * Passport OAuth User URL
   * @default 'https://passport.laravel.com/api/auth/me'
   */
  userURL?: string
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_PASSPORT_REDIRECT_URL or current URL
   */
  redirectURL?: string

}

export function defineOAuthPassportEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthPassportConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.passport, {
      baseURL: 'https://passport.laravel.com',
      userURL: 'https://passport.laravel.com/api/auth/me',
    }) as OAuthPassportConfig

    const query = getQuery<{ code?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'passport',
        ['clientId', 'clientSecret'],
        onError,
      )
    }
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    if (!query.code) {
      config.scope = config.scope || []
      // Redirect to Passport Oauth page
      return sendRedirect(
        event,
        withQuery(`${config.baseURL}/oauth/authorize` as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
        }),
      )
    }

    const tokens = await requestAccessToken(`${config.baseURL}/oauth/token` as string, {
      body: {
        grant_type: 'authorization_code',
        code: query.code as string,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'passport', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(`${config.baseURL}${config.userURL}` as string, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
