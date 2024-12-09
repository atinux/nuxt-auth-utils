import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { discovery } from 'openid-client'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
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
  /**
   * AWS Cognito App Custom Domain – some pool configurations require this
   * @default ''
   */
  domain?: string
}

export function defineOAuthCognitoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthCognitoConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.cognito, {
      authorizationParams: {},
    }) as OAuthCognitoConfig

    if (!config.clientId || !config.clientSecret || !config.userPoolId || !config.region) {
      return handleMissingConfiguration(event, 'cognito', ['clientId', 'clientSecret', 'userPoolId', 'region'], onError)
    }
    const congitoDiscoveryUrl = new URL(`https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/openid-configuration`)
    const issuer = await discovery(congitoDiscoveryUrl, config.clientId)
    const {
      authorization_endpoint: authorizationURL,
      token_endpoint: tokenURL,
      userinfo_endpoint: userinfoURL,
    } = issuer.serverMetadata()

    const query = getQuery<{ code?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

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
        }),
      )
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
    const endpointUrl = userinfoURL as string
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(endpointUrl, {
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
