import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, getRequestIP, getRequestHeader } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

/**
 * WorkOS OAuth Configuration
 * @see https://workos.com/docs/reference/user-management/authentication
 */
export interface OAuthWorkOSConfig {
  /**
   * WorkOS OAuth Client ID *required
   * @default process.env.NUXT_OAUTH_WORKOS_CLIENT_ID
   */
  clientId?: string
  /**
   * WorkOS OAuth Client Secret (API Key) *required
   * @default process.env.NUXT_OAUTH_WORKOS_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * WorkOS OAuth Organization ID *not required
   * @default process.env.NUXT_OAUTH_WORKOS_ORGANIZATION_ID
   */
  organizationId?: string
  /**
   * WorkOS OAuth Connection ID *not required
   * @default process.env.NUXT_OAUTH_WORKOS_CONNECTION_ID
   */
  connectionId?: string
  /**
   * WorkOS OAuth screen hint *not required
   * @default 'sign-in'
   */
  screenHint?: 'sign-in' | 'sign-up'
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_WORKOS_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export interface OAuthWorkOSUser {
  object: 'user'
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  email_verified: boolean
  profile_picture_url: string | null
  created_at: string
  updated_at: string
}

export type OAuthWorkOSAuthenticationMethod = 'SSO' | 'Password' | 'AppleOAuth' | 'GitHubOAuth' | 'GoogleOAuth' | 'MicrosoftOAuth' | 'MagicAuth' | 'Impersonation'

export interface OAuthWorkOSAuthenticateResponse {
  user: OAuthWorkOSUser
  organization_id: string | null
  access_token: string
  refresh_token: string
  error: string | null
  error_description: string | null
  authentication_method: OAuthWorkOSAuthenticationMethod
}

export interface OAuthWorkOSTokens {
  access_token: string
  refresh_token: string
}

export function defineOAuthWorkOSEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthWorkOSConfig, { user: OAuthWorkOSUser, tokens: OAuthWorkOSTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.workos, { screen_hint: 'sign-in' }) as OAuthWorkOSConfig

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'workos', ['clientId', 'clientSecret'], onError)
    }

    const query = getQuery<{ code?: string, state?: string, error?: string, error_description?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (query.error) {
      return handleAccessTokenErrorResponse(event, 'workos', query, onError)
    }

    if (!query.code) {
      // Redirect to WorkOS Oauth page
      return sendRedirect(
        event,
        withQuery('https://api.workos.com/user_management/authorize', {
          response_type: 'code',
          provider: 'authkit',
          client_id: config.clientId,
          redirect_uri: redirectURL || undefined,
          connection_id: config.connectionId || undefined,
          screen_hint: config.screenHint || 'sign-in',
          organization_id: config.organizationId || undefined,
        }),
      )
    }

    const authenticateResponse: OAuthWorkOSAuthenticateResponse = await requestAccessToken('https://api.workos.com/user_management/authenticate', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        ip_address: getRequestIP(event),
        user_agent: getRequestHeader(event, 'user-agent'),
        code: query.code,
      },
    })

    if (authenticateResponse.error) {
      return handleAccessTokenErrorResponse(event, 'workos', authenticateResponse, onError)
    }

    return onSuccess(event, {
      tokens: { access_token: authenticateResponse.access_token, refresh_token: authenticateResponse.refresh_token },
      user: authenticateResponse.user,
    })
  })
}
