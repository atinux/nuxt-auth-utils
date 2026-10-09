import type { RequestEvent } from 'nuxt/server'
import { defineEventHandler, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { $fetch } from 'ofetch'
import { defu } from 'defu'
import { discovery } from 'openid-client'
import { withQuery } from 'ufo'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleInvalidState, handleMissingConfiguration, handleState, requestAccessToken } from '../utils'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthCognitoConfig {
  /**
   * AWS Cognito App Client ID
   * @default process.env.NUXT_OAUTH_COGNITO_CLIENT_ID
   */
  clientId?: string
  /**
   * AWS Cognito App Client Secret
   * @default process.env.NUXT_OAUTH_COGNITO_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * AWS Cognito User Pool ID
   * @default process.env.NUXT_OAUTH_COGNITO_USER_POOL_ID
   */
  userPoolId?: string
  /**
   * AWS Cognito Region
   * @default process.env.NUXT_OAUTH_COGNITO_REGION
   */
  region?: string
  /**
   * AWS Cognito Scope
   * @default []
   */
  scope?: string[]
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_COGNITO_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthCognitoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthCognitoConfig>) {
  return defineEventHandler(async (event: RequestEvent) => {
    config = defu(config, useRuntimeConfig().oauth?.cognito, {
      authorizationParams: {},
    }) as OAuthCognitoConfig

    if (!config.clientId || !config.clientSecret || !config.userPoolId || !config.region) {
      return handleMissingConfiguration(event, 'cognito', ['clientId', 'clientSecret', 'userPoolId', 'region'], onError)
    }

    const congitoDiscoveryUrl = new URL(`https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/openid-configuration`)
    const issuer = await discovery(congitoDiscoveryUrl, config.clientId, config.clientSecret)
    const {
      authorization_endpoint: authorizationURL,
      token_endpoint: tokenURL,
      userinfo_endpoint: userinfoURL,
      // TODO: implement logout
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      end_session_endpoint: logoutURL,
    } = issuer.serverMetadata()
    const query = getQuery<{ code?: string, state?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || ['openid', 'profile']
      // Redirect to Cognito login page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          response_type: 'code',
          scope: config.scope.join(' '),
          ...config.authorizationParams,
          state,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'cognito', onError)
    }

    const tokens = await requestAccessToken(
      tokenURL as string,
      {
        body: {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectURL,
          code: query.code,
        },
      },
    )

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'cognito', tokens, onError)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    // TODO: improve typing of user profile
    const user: unknown = await $fetch(userinfoURL as string, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
