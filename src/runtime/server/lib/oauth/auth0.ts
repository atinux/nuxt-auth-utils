import type { H3Event, EventHandler } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthAccessTokenError, OAuthAccessTokenSuccess, OAuthConfig, OAuthToken, OAuthUser } from '#auth-utils'

/**
 * Auth0 User
 *
 * @see https://auth0.com/docs/api/authentication#user-profile
 */
type Auth0User = {
  email: string
  email_verified: boolean
  name: string
  picture: string
  sub: string
  updated_at: string
}

export interface OAuthAuth0Config {
  /**
   * Auth0 OAuth Client ID
   * @default process.env.NUXT_OAUTH_AUTH0_CLIENT_ID
   */
  clientId?: string
  /**
   * Auth0 OAuth Client Secret
   * @default process.env.NUXT_OAUTH_AUTH0_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Auth0 OAuth Issuer
   * @default process.env.NUXT_OAUTH_AUTH0_DOMAIN
   */
  domain?: string
  /**
   * Auth0 OAuth Audience
   * @default process.env.NUXT_OAUTH_AUTH0_AUDIENCE
   */
  audience?: string
  /**
   * Auth0 OAuth Scope
   * @default []
   * @see https://auth0.com/docs/get-started/apis/scopes/openid-connect-scopes
   * @example ['openid']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean
  /**
   * Maximum Authentication Age. If the elapsed time is greater than this value, the OP must attempt to actively re-authenticate the end-user.
   * @default 0
   * @see https://auth0.com/docs/authenticate/login/max-age-reauthentication
   */
  maxAge?: number
  /**
   * Login connection. If no connection is specified, it will redirect to the standard Auth0 login page and show the Login Widget.
   * @default ''
   * @see https://auth0.com/docs/api/authentication#social
   * @example 'github'
   */
  connection?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://auth0.com/docs/api/authentication#social
   * @example { display: 'popup' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_AUTH0_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthAuth0EventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthAuth0Config, Auth0User>): EventHandler {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.auth0, {
      authorizationParams: {},
    }) as OAuthAuth0Config
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.domain) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_AUTH0_CLIENT_ID or NUXT_OAUTH_AUTH0_CLIENT_SECRET or NUXT_OAUTH_AUTH0_DOMAIN env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }
    const authorizationURL = `https://${config.domain}/authorize`
    const tokenURL = `https://${config.domain}/oauth/token`

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || ['openid', 'offline_access']
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }
      // Redirect to Auth0 Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          audience: config.audience || '',
          max_age: config.maxAge || 0,
          connection: config.connection || '',
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await $fetch<unknown>(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: parsePath(redirectURL).pathname,
          code,
        },
      },
    )

    if ((tokens as OAuthAccessTokenError).error) {
      const error = createError({
        statusCode: 401,
        message: `Auth0 login failed: ${(tokens as OAuthAccessTokenError).error || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = (tokens as OAuthAccessTokenSuccess).token_type
    const accessToken = (tokens as OAuthAccessTokenSuccess).access_token

    const user = await $fetch<Auth0User>(`https://${config.domain}/userinfo`, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user: normalizeAuth0User(user),
      tokens: normalizeAuth0Tokens(tokens as OAuthAccessTokenSuccess),
    })
  })
}

function normalizeAuth0User(user: Auth0User): OAuthUser<Auth0User> {
  return {
    id: user.sub,
    nickname: user.name,
    name: user.name,
    email: user.email,
    avatar: user.picture,
    raw: user,
  }
}

function normalizeAuth0Tokens(tokens: OAuthAccessTokenSuccess): OAuthToken {
  return {
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    approvedScopes: tokens.scope?.split(' ') || [],
  }
}
