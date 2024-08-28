import type { H3Event, H3Error } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthMicrosoftConfig {
  /**
   * Microsoft OAuth Client ID
   * @default process.env.NUXT_OAUTH_MICROSOFT_CLIENT_ID
   */
  clientId?: string
  /**
   * Microsoft  OAuth Client Secret
   * @default process.env.NUXT_OAUTH_MICROSOFT_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Microsoft OAuth Tenant ID
   * @default process.env.NUXT_OAUTH_MICROSOFT_TENANT
   */
  tenant?: string
  /**
   * Microsoft  OAuth Scope
   * @default ['User.Read']
   * @see https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
   */
  scope?: string[]
  /**
   * Microsoft OAuth Authorization URL
   * @default 'https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize'
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  authorizationURL?: string
  /**
   * Microsoft OAuth Token URL
   * @default 'https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token'
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  tokenURL?: string
  /**
   * Microsoft OAuth User URL
   * @default 'https://graph.microsoft.com/v1.0/me'
   * @see https://docs.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0&tabs=http
   */
  userURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to prevent in prod prevent redirect_uri mismatch http to https
   * @default process.env.NUXT_OAUTH_MICROSOFT_REDIRECT_URL
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  redirectURL?: string
}

interface OAuthConfig {
  config?: OAuthMicrosoftConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function oauthMicrosoftEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.microsoft, {
      authorizationParams: {},
    }) as OAuthMicrosoftConfig

    const query = getQuery<{ code?: string }>(event)

    if (!config.clientId || !config.clientSecret || !config.tenant) {
      return handleMissingConfiguration(event, 'microsoft', ['clientId', 'clientSecret', 'tenant'], onError)
    }

    const authorizationURL = config.authorizationURL || `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize`
    const tokenURL = config.tokenURL || `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      const scope = config.scope && config.scope.length > 0 ? config.scope : ['User.Read']
      // Redirect to Microsoft Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectURL,
          scope: scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await requestAccessToken(tokenURL, {
      body: {
        grant_type: 'authorization_code',
        code: query.code as string,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'microsoft', tokens, onError)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const userURL = config.userURL || 'https://graph.microsoft.com/v1.0/me'
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(userURL, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    }).catch((error) => {
      return { error }
    })
    if (user.error) {
      const error = createError({
        statusCode: 401,
        message: `Microsoft login failed: ${user.error || 'Unknown error'}`,
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
