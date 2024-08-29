import type { H3Event } from 'h3'
import { eventHandler, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { handleAccessTokenErrorResponse, handleMissingConfiguration } from '../utils'
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

export function oauthCognitoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthCognitoConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.cognito, {
      authorizationParams: {},
    }) as OAuthCognitoConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.userPoolId || !config.region) {
      return handleMissingConfiguration(event, 'cognito', ['clientId', 'clientSecret', 'userPoolId', 'region'], onError)
    }

    const urlBase = config?.domain || `${config.userPoolId}.auth.${config.region}.amazoncognito.com`

    const authorizationURL = `https://${urlBase}/oauth2/authorize`
    const tokenURL = `https://${urlBase}/oauth2/token`

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
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

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=authorization_code&client_id=${config.clientId}&client_secret=${config.clientSecret}&redirect_uri=${parsePath(redirectURL).pathname}&code=${code}`,
      },
    ).catch((error) => {
      return { error }
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'cognito', tokens, onError)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(`https://${urlBase}/oauth2/userInfo`, {
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
