import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, handleState, handleInvalidState } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
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
   * @default 'https://login.salesforce.com/services/oauth2/authorize'
   */
  authorizationURL?: string
  /**
   * Salesforce OAuth Authorization URL
   * @default 'https://login.salesforce.com/services/oauth2/token'
   */
  tokenURL?: string
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
  return eventHandler(async (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig(event).oauth?.salesforce
    const baseURL = config?.baseURL ?? 'https://login.salesforce.com'
    config = defu(config, runtimeConfig, {
      authorizationURL: `${baseURL}/services/oauth2/authorize`,
      tokenURL: `${baseURL}/services/oauth2/token`,
      authorizationParams: {},
    }) as OAuthSalesforceConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
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
          state,
          ...config.authorizationParams,
        }),
      )
    }

    if (query.state !== state) {
      handleInvalidState(event, 'salesforce', onError)
    }

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
      return handleAccessTokenErrorResponse(event, 'salesforce', tokens, onError)
    }

    const accessToken = tokens.access_token
    const user = await $fetch(`${baseURL}/services/oauth2/userinfo`, {
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
