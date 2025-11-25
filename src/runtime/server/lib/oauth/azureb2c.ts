import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, handlePkceVerifier, handleState, handleInvalidState } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthAzureB2CConfig {
  /**
   * Azure OAuth Client ID
   * @default process.env.NUXT_OAUTH_AZUREB2C_CLIENT_ID
   */
  clientId?: string
  /**
   * Azure OAuth Policy
   * @default process.env.NUXT_OAUTH_AZUREB2C_POLICY
   */
  policy?: string
  /**
   * Azure OAuth Tenant ID
   * @default process.env.NUXT_OAUTH_AZUREB2C_TENANT
   */
  tenant?: string
  /**
   * Azure OAuth Scope
   * @default ['offline_access']
   * @see https://learn.microsoft.com/en-us/azure/active-directory-b2c/access-tokens#scopes
   */
  scope?: string[]
  /**
   * Azure OAuth Authorization URL
   * @default 'https://${tenant}.onmicrosoft.com/${policy}/oauth2/v2.0/token'
   * @see https://learn.microsoft.com/en-us/azure/active-directory-b2c/openid-connect
   */
  authorizationURL?: string
  /**
   * Azure OAuth Token URL
   * @default 'https://${tenant}.onmicrosoft.com/${policy}/oauth2/v2.0/token'
   * @see https://learn.microsoft.com/en-us/azure/active-directory-b2c/openid-connect
   */
  tokenURL?: string
  /**
   * Azure OAuth User URL
   * @default 'https://graph.microsoft.com/v1.0/me'
   * @see https://docs.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0&tabs=http
   */
  userURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://learn.microsoft.com/en-us/azure/active-directory-b2c/authorization-code-flow
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to prevent in prod prevent redirect_uri mismatch http to https
   * @default process.env.NUXT_OAUTH_AZUREB2C_REDIRECT_URL
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  redirectURL?: string
}

export function defineOAuthAzureB2CEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthAzureB2CConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.azureb2c, {
      authorizationParams: {},
    }) as OAuthAzureB2CConfig

    const query = getQuery<{ code?: string, state?: string }>(event)

    if (!config.clientId || !config.policy || !config.tenant) {
      return handleMissingConfiguration(event, 'azureb2c', ['clientId', 'policy', 'tenant'], onError)
    }

    const authorizationURL = config.authorizationURL || `https://${config.tenant}.b2clogin.com/${config.tenant}.onmicrosoft.com/${config.policy}/oauth2/v2.0/authorize`
    const tokenURL = config.tokenURL || `https://${config.tenant}.b2clogin.com/${config.tenant}.onmicrosoft.com/${config.policy}/oauth2/v2.0/token`

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    // guarantee uniqueness of the scope
    config.scope = config.scope && config.scope.length > 0 ? config.scope : ['openid']
    config.scope = [...new Set(config.scope)]

    // Create pkce verifier
    const onlyConsume = !!query.code
    const verifier = await handlePkceVerifier(event, { onlyConsume })
    const state = await handleState(event, { onlyConsume })

    if (!query.code) {
      // Redirect to Azure B2C Oauth page
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
          ...config.authorizationParams,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'azureb2c', onError)
    }

    console.info('code verifier', verifier.code_verifier)
    const tokens = await requestAccessToken(tokenURL, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        scope: config.scope.join(' '),
        code: query.code as string,
        redirect_uri: redirectURL,
        response_type: 'code',
        code_verifier: verifier.code_verifier,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'azureb2c', tokens, onError)
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
        message: `azureb2c login failed: ${user.error || 'Unknown error'}`,
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
