import type { H3Event, EventHandler } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig, OAuthToken, OAuthUser, OAuthAccessTokenSuccess, OAuthAccessTokenError } from '#auth-utils'

/**
 * AWS Cognito User
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/userinfo-endpoint.html
 */
type CognitoUser = {
  sub: string
  email_verified: boolean
  email: string
  username: string
  name: string
  picture: string
  phone_number_verified: boolean
  phone_number: string
}

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

export function oauthCognitoEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthCognitoConfig, CognitoUser>): EventHandler {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.cognito, {
      authorizationParams: {},
    }) as OAuthCognitoConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.userPoolId || !config.region) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_COGNITO_CLIENT_ID, NUXT_OAUTH_COGNITO_CLIENT_SECRET, NUXT_OAUTH_COGNITO_USER_POOL_ID, or NUXT_OAUTH_COGNITO_REGION env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const authorizationURL = `https://${config.userPoolId}.auth.${config.region}.amazoncognito.com/oauth2/authorize`
    const tokenURL = `https://${config.userPoolId}.auth.${config.region}.amazoncognito.com/oauth2/token`

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

    const tokens = await $fetch<unknown>(
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

    if ((tokens as OAuthAccessTokenError).error) {
      const error = createError({
        statusCode: 401,
        message: `Cognito login failed: ${(tokens as OAuthAccessTokenError).error || 'Unknown error'}`,
        data: tokens as OAuthAccessTokenError,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = (tokens as OAuthAccessTokenSuccess).token_type
    const accessToken = (tokens as OAuthAccessTokenSuccess).access_token

    const user = await $fetch<CognitoUser>(`https://${config.userPoolId}.auth.${config.region}.amazoncognito.com/oauth2/userInfo`, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user: normalizeCognitoUser(user),
      tokens: normalizeCognitoToken(tokens as OAuthAccessTokenSuccess),
    })
  })
}

function normalizeCognitoUser(user: CognitoUser): OAuthUser<CognitoUser> {
  return {
    id: user.sub,
    email: user.email,
    nickname: user.username,
    name: user.name,
    avatar: user.picture,
    raw: user,
  }
}

function normalizeCognitoToken(tokens: OAuthAccessTokenSuccess): OAuthToken {
  return {
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    approvedScopes: tokens.scope?.split(' '),
  }
}
