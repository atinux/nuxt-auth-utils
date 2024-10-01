import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleAccessTokenErrorResponse, handleMissingConfiguration, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthPolarConfig {
  /**
   * Polar Client ID
   * @default process.env.NUXT_OAUTH_POLAR_CLIENT_ID
   */
  clientId?: string

  /**
   * Polar OAuth Client Secret
   * @default process.env.NUXT_OAUTH_POLAR_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Polar OAuth Scope
   * @default []
   * @see https://api.polar.sh/.well-known/openid-configuration
   * @example ['openid']
   */
  scope?: string[]

  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * Polar OAuth Authorization URL
   * @see https://docs.polar.sh/api/authentication#start-the-authorization-flow
   * @default 'https://polar.sh/oauth2/authorize'
   */
  authorizationURL?: string

  /**
   * Polar OAuth Token URL
   * @see https://docs.polar.sh/api/authentication#exchange-the-authorization-code
   * @default 'https://api.polar.sh/v1/oauth2/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.polar.sh/api/authentication#user-vs-organization-access-tokens
   * @example { sub_type: 'organization' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_POLAR_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthPolarEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthPolarConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.polar, {
      authorizationURL: 'https://polar.sh/oauth2/authorize',
      tokenURL: 'https://api.polar.sh/v1/oauth2/token',
    }) as OAuthPolarConfig
    const query = getQuery<{ code?: string }>(event)
    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'polar', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (!config.scope.includes('openid'))
        config.scope.push('openid')
      if (config.emailRequired && !config.scope.includes('email'))
        config.scope.push('email')

      // Redirect to Polar Oauth page
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

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'polar', tokens, onError)
    }
    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://api.polar.sh/v1/oauth2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Polar user',
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
