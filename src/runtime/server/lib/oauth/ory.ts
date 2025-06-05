import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  getOAuthRedirectURL,
  handleAccessTokenErrorResponse,
  handleInvalidState,
  handleMissingConfiguration,
  handlePkceVerifier,
  handleState,
  requestAccessToken,
} from '../utils'
import { createError, useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

/**
 * Ory OAuth2
 * @see https://www.ory.sh/docs/oauth2-oidc/authorization-code-flow
 */

export interface OAuthOryConfig {
  /**
   * Ory OAuth Client ID
   * @default process.env.NUXT_OAUTH_ORY_CLIENT_ID
   */
  clientId?: string
  /**
   * Ory OAuth Client Secret
   * @default process.env.NUXT_OAUTH_ORY_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Ory OAuth SDK URL
   * @default "https://playground.projects.oryapis.com" || process.env.NUXT_OAUTH_ORY_SDK_URL
   */
  sdkURL?: string
  /**
   * Ory OAuth Scope
   * @default ['openid', 'offline']
   * @see https://docs.oryhydra.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
   * @example ['openid', 'offline', 'email']
   */
  scope?: string[] | string
  /**
   * Ory OAuth Authorization URL
   * @default '/oauth2/auth'
   */
  authorizationURL?: string

  /**
   * Ory OAuth Token URL
   * @default '/oauth2/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @example { allow_signup: 'true' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Ory OAuth Userinfo URL
   * @default '/userinfo'
   */
  userURL?: string
}

export function oryHydraEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthOryConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.ory, {
      scope: ['openid', 'offline'],
      sdkURL: 'https://playground.projects.oryapis.com',
      authorizationURL: '/oauth2/auth',
      tokenURL: '/oauth2/token',
      userURL: '/userinfo',
      authorizationParams: {},
    }) as OAuthOryConfig

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = getQuery<{ code?: string, state?: string, error: any }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `ory login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.sdkURL) {
      return handleMissingConfiguration(event, 'ory', ['clientId', 'sdkURL'], onError)
    }

    const redirectURL = getOAuthRedirectURL(event)

    // guarantee uniqueness of the scope and convert to string if it's an array
    if (Array.isArray(config.scope)) {
      config.scope = Array.from(new Set(config.scope)).join(' ')
    }

    // Create pkce verifier
    const verifier = await handlePkceVerifier(event)
    const state = await handleState(event)

    if (!query.code) {
      const authorizationURL = `${config.sdkURL}${config.authorizationURL}`
      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectURL,
          scope: config.scope,
          state,
          code_challenge: verifier.code_challenge,
          code_challenge_method: verifier.code_challenge_method,
          ...config.authorizationParams,
        }),
      )
    }

    if (query.state !== state) {
      handleInvalidState(event, 'ory', onError)
    }

    const tokenURL = `${config.sdkURL}${config.tokenURL}`
    const tokens = await requestAccessToken(tokenURL, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code: query.code as string,
        redirect_uri: redirectURL,
        scope: config.scope,
        code_verifier: verifier.code_verifier,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'ory', tokens, onError)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token

    const userURL = `${config.sdkURL}${config.userURL}`
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(userURL, {
      headers: {
        'User-Agent': `Ory-${config.clientId}`,
        'Authorization': `${tokenType} ${accessToken}`,
      },
    }).catch((error) => {
      return { error }
    })
    if (user.error) {
      const error = createError({
        statusCode: 401,
        message: `ory login failed: ${user.error || 'Unknown error'}`,
        data: user,
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
