import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleInvalidState, handleMissingConfiguration, handleState, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthBoxConfig {
  /**
   * Box OAuth Client ID
   * @default process.env.NUXT_OAUTH_BOX_CLIENT_ID
   */
  clientId?: string
  /**
   * Box OAuth Client Secret
   * @default process.env.NUXT_OAUTH_BOX_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Box OAuth Scope
   * @default []
   * @see https://developer.box.com/guides/api-calls/permissions-and-errors/scopes/
   */
  scope?: string[]
  /**
   * Box OAuth Authorization URL
   * @default 'https://account.box.com/api/oauth2/authorize'
   */
  authorizationURL?: string
  /**
   * Box OAuth Token URL
   * @default 'https://api.box.com/oauth2/token'
   */
  tokenURL?: string
  /**
   * Box User Info URL
   * @default 'https://api.box.com/2.0/users/me'
   */
  userURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developer.box.com/guides/authentication/oauth2/oauth2-setup/
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_BOX_REDIRECT_URL
   */
  redirectURL?: string
}

/**
 * Box User object returned from /2.0/users/me
 * @see https://developer.box.com/reference/get-users-me/
 * @see https://www.postman.com/boxdev/box-s-public-workspace/example/8119550-f7344611-7834-4040-a4ae-d6b3ef95bfdb
 */
interface BoxUser {
  type: 'user'
  id: string
  name: string
  login: string
  created_at: string
  modified_at: string
  language: string
  timezone: string
  space_amount: number
  space_used: number
  max_upload_size: number
  status: 'active' | 'inactive' | 'cannot_delete_edit' | 'cannot_delete_edit_upload'
  job_title?: string
  phone?: string
  address?: string
  avatar_url?: string
}

/**
 * Box OAuth tokens
 * @see https://developer.box.com/reference/post-oauth2-token/
 * @see https://www.postman.com/boxdev/box-s-public-workspace/example/8119550-70a8e5bd-4d25-494c-be2c-5409db9d1ace
 */
interface BoxTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: 'bearer'
  restricted_to?: Array<{
    scope: string
    object?: {
      type: string
      id: string
    }
  }>
}

/**
 * Define an OAuth event handler for Box authentication.
 * @see https://developer.box.com/guides/authentication/oauth2/
 * @see https://www.postman.com/boxdev/box-s-public-workspace/collection/trhp912/box-platform-api
 */
export function defineOAuthBoxEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBoxConfig, { user: BoxUser, tokens: BoxTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.box, {
      authorizationURL: 'https://account.box.com/api/oauth2/authorize',
      tokenURL: 'https://api.box.com/oauth2/token',
      userURL: 'https://api.box.com/2.0/users/me',
      authorizationParams: {},
    }) as OAuthBoxConfig

    const query = getQuery<{ code?: string, error?: string, error_description?: string, state?: string }>(event)

    // Handle OAuth error callback
    if (query.error) {
      // @see https://developer.box.com/reference/resources/oauth2-error
      const errorMessageParts = [query.error, query.error_description].filter(Boolean).join(': ')
      const error = createError({
        statusCode: 401,
        message: `Box login failed: ${errorMessageParts || 'Unknown error'}`,
        data: query,
      })

      if (!onError) throw error
      return onError(event, error)
    }

    // Validate required configuration
    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'box', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    // Step 1: Redirect to Box authorization page
    if (!query.code) {
      const scope = config.scope || []

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: scope.join(' '),
          state,
          ...config.authorizationParams,
        }),
      )
    }

    // Step 2: Handle callback with authorization code
    if (query.state !== state) {
      return handleInvalidState(event, 'box', onError)
    }

    // Step 3: Exchange code for access token
    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'box', tokens, onError)
    }

    // Step 4: Fetch user information
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: BoxUser = await $fetch(config.userURL as string, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
