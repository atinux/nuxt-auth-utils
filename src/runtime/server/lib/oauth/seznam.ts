import defu from 'defu'
import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleMissingConfiguration, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthSeznamConfig {
  /**
   * Seznam OAuth Client ID
   * @default process.env.NUXT_OAUTH_SEZNAM_CLIENT_ID
   */
  clientId?: string

  /**
   * Seznam OAuth Client Secret
   * @default process.env.NUXT_OAUTH_SEZNAM_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Seznam OAuth Scope
   * @default ['identity']
   * @see https://vyvojari.seznam.cz/oauth/scopes?lang=en
   * @example ['identity', 'avatar']
   */
  scope?: string[]

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * Redirect URL has to be set as well in the Seznam OAuth settings https://vyvojari.seznam.cz/oauth/admin in order for it to work
   * @see https://vyvojari.seznam.cz/oauth/admin
   * @default process.env.NUXT_OAUTH_SEZNAM_REDIRECT_URL
   */
  redirectURL?: string

  /**
   * Seznam OAuth Authorization URL
   * @default 'https://login.szn.cz/api/v1/oauth/auth'
   */
  authorizationURL?: string

  /**
   * Seznam OAuth Token URL
   * @default 'https://login.szn.cz/api/v1/oauth/token'
   */
  tokenURL?: string

  /**
   * Seznam OAuth User URL
   * @default 'https://login.szn.cz/api/v1/user'
   */
  userURL?: string
}

export interface OAuthSeznamUser {
  /**
   * Unique persistent user account identifier
   */
  oauth_user_id: string

  /**
   * The user's e-mail address or null for users without an e-mail
   */
  email: string | null

  /**
   * Given name (when available)
   */
  firstname: string

  /**
   * Family name (when available)
   */
  lastname: string

  /**
   * User account identifier suitable for usage within the Seznam ad infrastructure
   */
  advert_user_id: string

  /**
   * (only when provided and validated by the user; null otherwise)
   * Available only when you use the contact-phone scope
   * @see https://vyvojari.seznam.cz/oauth/scopes?lang=en
   */
  contact_phone?: string | null

  /**
   *  the image's URL
   * Available only when you use the avatar scope
   * @see https://vyvojari.seznam.cz/oauth/scopes?lang=en
   */
  avatar_url?: string | null

  /**
   * true/false value corresponding to the user's adult status
   * Available only when you use the avatar scope
   * @see https://vyvojari.seznam.cz/oauth/scopes?lang=en
   */
  adulthood?: boolean

  /**
   * date of birth in the ISO 8601 format (only when present; null otherwise)
   * Available only when you use the birthday scope
   * @see https://vyvojari.seznam.cz/oauth/scopes?lang=en
   */
  birthday?: string | null

  /**
   * one of the allowed strings "Male" / "Female" / "Other" (null if not set)
   * Available only when you use the gender scope
   * @see https://vyvojari.seznam.cz/oauth/scopes?lang=en
   */
  gender?: string | null
}

export function defineOAUthSeznamEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthSeznamConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.google, {
      authorizationURL: 'https://login.szn.cz/api/v1/oauth/auth',
      tokenURL: 'https://login.szn.cz/api/v1/oauth/token',
      userURL: 'https://login.szn.cz/api/v1/user',
    }) as OAuthSeznamConfig

    const query = getQuery<{ code?: string, state?: string }>(event)

    if (!config.clientId) {
      return handleMissingConfiguration(event, 'seznam', ['clientId'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    if (!query.code) {
      config.scope = config.scope || ['identity'] // identity is mandatory

      // Redirect to Seznam Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(','),
          state: query.state || '',
        }),
      )
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        code: query.code as string,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'seznam', tokens, onError)
    }

    const accessToken = tokens.access_token
    const user: OAuthSeznamUser = await $fetch(
      config.userURL as string,
      {
        headers: {
          Authorization: `bearer ${accessToken}`,
        },
      },
    )

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
