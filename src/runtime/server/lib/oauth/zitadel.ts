import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthZitadelConfig {
  /**
   * ZITADEL OAuth Client ID
   * @default process.env.NUXT_OAUTH_ZITADEL_CLIENT_ID
   */
  clientId?: string
  /**
   * ZITADEL OAuth Client Secret
   * @default process.env.NUXT_OAUTH_ZITADEL_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * ZITADEL OAuth Domain
   * @example <your-zitadel-instance>.zitadel.cloud
   * @default process.env.NUXT_OAUTH_ZITADEL_DOMAIN
   */
  domain?: string
  /**
   * ZITADEL OAuth Scope
   * @default ['openid']
   * @see https://zitadel.com/docs/apis/openidoauth/scopes
   * @example ['openid', 'profile', 'email']
   */
  scope?: string[]
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @example { ui_locales: 'de-CH de en' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_ZITADEL_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthZitadelEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthZitadelConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.zitadel, {
      authorizationParams: {},
    }) as OAuthZitadelConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Zitadel login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret || !config.domain) {
      return handleMissingConfiguration(event, 'zitadel', ['clientId', 'clientSecret', 'issuerUrl'], onError)
    }

    const authorizationURL = `https://${config.domain}/oauth/v2/authorize`
    const tokenURL = `https://${config.domain}/oauth/v2/token`
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || ['openid']
      // Redirect to Zitadel OAuth page

      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await requestAccessToken(tokenURL, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'zitadel', tokens, onError)
    }

    const accessToken = tokens.access_token
    // Fetch user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(`https://${config.domain}/oidc/v1/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Zitadel user',
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
