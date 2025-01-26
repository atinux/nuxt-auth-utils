import type { H3Event } from 'h3'
import { eventHandler, getRequestHeader, readBody, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, signJwt, verifyJwt } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthAppleConfig {
  /**
   * Apple OAuth Client ID
   * @default process.env.NUXT_OAUTH_APPLE_CLIENT_ID
   */
  clientId?: string

  /**
   * Apple OAuth team ID
   * @default process.env.NUXT_OAUTH_APPLE_TEAM_ID
   */
  teamId?: string

  /**
   * Apple OAuth key identifier
   * @default process.env.NUXT_OAUTH_APPLE_KEY_ID
   */
  keyId?: string

  /**
   * Apple OAuth Private Key. Linebreaks must be replaced with \n
   * @example '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM...\n-----END PRIVATE KEY-----'
   * @default process.env.NUXT_OAUTH_APPLE_PRIVATE_KEY
   */
  privateKey?: string

  /**
   * Apple OAuth Scope. Apple wants this to be a string separated by spaces, but for consistency with other providers, we also allow an array of strings.
   * @default ''
   * @see https://developer.apple.com/documentation/sign_in_with_apple/clientconfigi/3230955-scope
   * @example 'name email'
   */
  scope?: string | string[]

  /**
   * Apple OAuth Authorization URL
   * @default 'https://appleid.apple.com/auth/authorize'
   */
  authorizationURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developer.apple.com/documentation/sign_in_with_apple/clientconfigi/3230955-scope
   * @example { usePop: true }
   */
  authorizationParams?: Record<string, string | boolean>

  /**
   * Apple OAuth Token URL
   * @default 'https://appleid.apple.com/auth/token'
   */
  tokenURL?: string

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_APPLE_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export interface OAuthAppleTokens {
  iss: string
  aud: string
  exp: number
  iat: number
  sub: string
  at_hash: string
  email: string
  email_verified: boolean
  is_private_email: boolean
  auth_time: number
  nonce_supported: boolean
}

export interface OAuthAppleUser {
  name?: {
    firstName?: string
    lastName?: string
  }
  email?: string
}

export function defineOAuthAppleEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthAppleConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.apple, {
      authorizationURL: config?.authorizationURL || 'https://appleid.apple.com/auth/authorize',
      authorizationParams: {},
    }) as OAuthAppleConfig

    if (!config.teamId || !config.keyId || !config.privateKey || !config.clientId) {
      return handleMissingConfiguration(event, 'apple', ['teamId', 'keyId', 'privateKey', 'clientId'], onError)
    }

    // instead of a query, apple sends a form post back after login
    const isPost = getRequestHeader(event, 'content-type') === 'application/x-www-form-urlencoded'

    let code: string | undefined
    let user: OAuthAppleUser | undefined

    if (isPost) {
      // `user` will only be available the first time a user logs in.
      ({ code, user } = await readBody<{ code: string, user?: OAuthAppleUser }>(event))
    }

    // Send user to apple login page.
    if (!isPost || !code) {
      const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

      config.scope = Array.isArray(config.scope)
        ? config.scope.join(' ')
        : (config.scope || 'name email')

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          response_mode: 'form_post',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope,
          ...config.authorizationParams,
        }),
      )
    }

    // Verify the form post data we got back from apple
    try {
      const secret = await signJwt(
        {
          iss: config.teamId,
          aud: 'https://appleid.apple.com',
          sub: config.clientId,
        },
        {
          privateKey: config.privateKey,
          keyId: config.keyId,
          teamId: config.teamId,
          clientId: config.clientId,
          expiresIn: '5m',
        },
      )

      const accessTokenResult = await requestAccessToken(config.tokenURL || 'https://appleid.apple.com/auth/token', {
        params: {
          client_id: config.clientId,
          client_secret: secret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectURL,
        },
      })

      const tokens = await verifyJwt<OAuthAppleTokens>(accessTokenResult.id_token, {
        publicJwkUrl: 'https://appleid.apple.com/auth/keys',
        audience: config.clientId,
        issuer: 'https://appleid.apple.com',
      })

      if (!tokens) {
        return handleAccessTokenErrorResponse(event, 'apple', tokens, onError)
      }

      return onSuccess(event, { user, tokens })
    }
    catch (error) {
      return handleAccessTokenErrorResponse(event, 'apple', error, onError)
    }
  })
}
