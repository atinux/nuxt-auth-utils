import type { RequestEvent } from 'nuxt/server'
import { defineEventHandler, createError, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, handleState, handleInvalidState, handlePkceVerifier } from '../utils'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthSalesforceConfig {
  /**
   * Salesforce OAuth Client ID
   * @default process.env.NUXT_OAUTH_SALESFORCE_CLIENT_ID
   */
  clientId?: string
  /**
   * Salesforce OAuth Client Secret
   * @default process.env.NUXT_OAUTH_SALESFORCE_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Salesforce OAuth Scope
   * @default ['id']
   * @see https://help.salesforce.com/s/articleView?id=xcloud.remoteaccess_oauth_tokens_scopes.htm
   * @example ['id']
   */
  scope?: string[]
  /**
   * Salesforce MyDomain URL
   * @default 'https://login.salesforce.com'
   */
  baseURL?: string
  /**
   * Salesforce OAuth Authorization URL
   * @default '${baseURL}/services/oauth2/authorize'
   */
  authorizationURL?: string
  /**
   * Salesforce OAuth Token URL
   * @default '${baseURL}/services/oauth2/token'
   */
  tokenURL?: string
  /**
   * Salesforce OAuth User URL
   * @default '${baseURL}/services/oauth2/userinfo'
   */
  userURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @default {}
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_SALESFORCE_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthSalesforceEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthSalesforceConfig>) {
  return defineEventHandler(async (event: RequestEvent) => {
    const runtimeConfig = useRuntimeConfig().oauth?.salesforce
    const baseURL = config?.baseURL || runtimeConfig?.baseURL || 'https://login.salesforce.com'
    config = defu(config, runtimeConfig, {
      authorizationURL: `${baseURL}/services/oauth2/authorize`,
      tokenURL: `${baseURL}/services/oauth2/token`,
      authorizationParams: {},
    }) as OAuthSalesforceConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        status: 401,
        message: `Salesforce login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'salesforce', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const pkce = await handlePkceVerifier(event)
    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || ['id']
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
          code_challenge: pkce.code_challenge,
          code_challenge_method: pkce.code_challenge_method,
          state,
        }),
      )
    }

    if (!state || query.state !== state) {
      return handleInvalidState(event, 'salesforce', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
        code_verifier: pkce.code_verifier,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'salesforce', tokens, onError)
    }

    const accessToken = tokens.access_token
    const user = await $fetch(config.userURL || `${baseURL}/services/oauth2/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
