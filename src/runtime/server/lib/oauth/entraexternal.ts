import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, handlePkceVerifier, handleState, handleInvalidState } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

/**
 * Microsoft Entra External ID (CIAM) OAuth (OIDC) handler
 * Minimal code-flow with PKCE, no MSAL. Parity with Azure B2C style,
 * but using `ciamlogin.com` endpoints and OIDC UserInfo.
 */
export interface OAuthEntraExternalConfig {
  /**
   * Entra External OAuth Client ID (Application ID)
   * @default process.env.NUXT_OAUTH_ENTRAEXTERNAL_CLIENT_ID
   */
  clientId?: string
  /**
   * Entra External Tenant identifier used in endpoints.
   * Accepts tenant subdomain (e.g. "contoso").
   * Used as: https://{tenant}.ciamlogin.com/{tenantId}/oauth2/v2.0/...
   * @default process.env.NUXT_OAUTH_ENTRAEXTERNAL_TENANT
   * @see https://learn.microsoft.com/entra/architecture/deployment-external-operations  (ciamlogin format)
   */
  tenant?: string
  /**
   * Entra External Tenant identifier used in endpoints.
   * Accepts tenant GUID.
   * Used as: https://{tenant}.ciamlogin.com/{tenantId}/oauth2/v2.0/...
   * @default process.env.NUXT_OAUTH_ENTRAEXTERNAL_TENANT_ID
   * @see https://learn.microsoft.com/entra/architecture/deployment-external-operations  (ciamlogin format)
   */
  tenantId?: string
  /**
   * Scopes for OIDC. Keep minimal: 'openid' required.
   * Add 'offline_access' for refresh tokens; 'profile','email' for basic claims.
   * Use 'User.Read' only if you plan to call Microsoft Graph /me.
   * @default ['openid offline_access profile email']
   * @see https://learn.microsoft.com/entra/identity-platform/scopes-oidc
   * @see https://learn.microsoft.com/entra/external-id/customers/concept-supported-features-customers  (allowed perms in external tenants)
   */
  scope?: string[]
  /**
   * Authorization endpoint.
   * Default (user flow can be passed via `authorizationParams.p` if required).
   * @example https://{tenant}.ciamlogin.com/{tenant}/oauth2/v2.0/authorize
   * @see https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
   */
  authorizationURL?: string
  /**
   * Token endpoint.
   * @example https://{tenant}.ciamlogin.com/{tenant}/oauth2/v2.0/token
   * @see https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
   */
  tokenURL?: string
  /**
   * OIDC UserInfo endpoint (preferred over Graph /me for basic claims).
   * @default 'https://graph.microsoft.com/oidc/userinfo'
   * @see https://learn.microsoft.com/entra/identity-platform/userinfo
   */
  userURL?: string
  /**
   * Extra authorization parameters (e.g. { p: 'B2C_1_signup_signin' } if needed)
   */
  authorizationParams?: Record<string, string>
  /**
   * Explicit redirect URL to avoid mismatch (e.g., HTTP→HTTPS)
   * @default process.env.NUXT_OAUTH_ENTRAEXTERNAL_REDIRECT_URL or getOAuthRedirectURL(event)
   */
  redirectURL?: string
}

export function defineOAuthEntraExternalEventHandler({
  config,
  onSuccess,
  onError
}: OAuthConfig<OAuthEntraExternalConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(
      config,
      useRuntimeConfig(event).oauth?.entraexternal,
      { authorizationParams: {} }
    ) as OAuthEntraExternalConfig

    const query = getQuery<{ code?: string; state?: string }>(event)

    if (!config.clientId || !config.tenant) {
      return handleMissingConfiguration(
        event,
        'entraexternal',
        ['clientId', 'tenant'],
        onError
      )
    }

    // Build Entra External endpoints (ciamlogin)
    const authorizationURL =
      config.authorizationURL ||
      `https://${config.tenant}.ciamlogin.com/${config.tenantId}/oauth2/v2.0/authorize`
    const tokenURL =
      config.tokenURL ||
      `https://${config.tenant}.ciamlogin.com/${config.tenantId}/oauth2/v2.0/token`

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    // Ensure minimal, unique scopes (OIDC requires 'openid')
    config.scope = (config.scope && config.scope.length > 0) ? config.scope : ['openid']
    config.scope = [...new Set(config.scope)]

    // PKCE + state
    const verifier = await handlePkceVerifier(event)
    const state = await handleState(event)

    // Step 1: redirect to Entra External authorize
    if (!query.code) {
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
          code_challenge: verifier.code_challenge,
          code_challenge_method: verifier.code_challenge_method,
          ...config.authorizationParams
        })
      )
    }

    // Step 2: callback – validate state, exchange code
    if (query.state !== state) {
      return handleInvalidState(event, 'entraexternal', onError)
    }

      const tokens = await requestAccessToken(tokenURL, {
        body: {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          code: query.code as string,
          redirect_uri: redirectURL,
          code_verifier: verifier.code_verifier,
          // optional but fine to include:
          scope: config.scope.join(' ')
        },
        headers: {
          origin: event.node.req.headers.origin || '',
        }
      })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'entraexternal', tokens, onError)
    }

    // Prefer OIDC UserInfo for basic claims; Graph /me requires User.Read consent
    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const userURL = config.userURL || 'https://graph.microsoft.com/oidc/userinfo'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(userURL, {
      headers: { Authorization: `${tokenType} ${accessToken}` }
    }).catch((error) => ({ error }))

    if (user.error) {
      const error = createError({
        statusCode: 401,
        message: `entraexternal login failed: ${user.error || 'Unknown error'}`,
        data: user
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, { tokens, user })
  })
}
