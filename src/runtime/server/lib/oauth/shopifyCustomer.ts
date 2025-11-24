import type { H3Event } from 'h3'
import { createError, eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleMissingConfiguration, handlePkceVerifier, handleState, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

interface ShopifyCustomer {
  customer: {
    firstName: string | null
    lastName: string | null
    emailAddress: {
      emailAddress: string
    }
  }
}

interface AccessTokenResponse {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  error?: string
}

interface CustomerDiscoveryResponse {
  issuer: string
  token_endpoint: string
  authorization_endpoint: string
  end_session_endpoint: string
}

interface CustomerApiDiscoveryResponse {
  graphql_api: string
  mcp_api: string
}

export interface OAuthShopifyCustomerConfig {
  /**
   * Shopify shop domain ID
   * @default process.env.NUXT_OAUTH_SHOPIFY_CUSTOMER_SHOP_DOMAIN
   * @example 123.myshopify.com
   */
  shopDomain?: string

  /**
   * Shopify Customer Client ID
   * @default process.env.NUXT_OAUTH_SHOPIFY_CUSTOMER_CLIENT_ID
   */
  clientId?: string

  /**
   * Shopify Customer OAuth Scope
   * @default ['openid', 'email', 'customer-account-api:full']
   * @example ['openid', 'email', 'customer-account-api:full']
   */
  scope?: string[]

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_SHOPIFY_CUSTOMER_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthShopifyCustomerEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthShopifyCustomerConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.shopifyCustomer, {}) as OAuthShopifyCustomerConfig

    const query = getQuery<{ code?: string, state?: string }>(event)

    if (!config.clientId || !config.shopDomain) {
      return handleMissingConfiguration(event, 'spotify', ['clientId', 'shopDomain'], onError)
    }

    // Create pkce verifier
    const verifier = await handlePkceVerifier(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    const discoveryResponse: CustomerDiscoveryResponse | null = await $fetch(`https://${config.shopDomain}/.well-known/openid-configuration`)
      .then(d => d as CustomerDiscoveryResponse)
      .catch(() => null)
    if (!discoveryResponse?.issuer) {
      const error = createError({
        statusCode: 400,
        message: 'Getting Shopify discovery endpoint failed.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const state = await handleState(event)

    if (!query.code) {
      // guarantee uniqueness of the scope
      config.scope = config.scope && config.scope.length > 0 ? config.scope : ['openid', 'email', 'customer-account-api:full']
      config.scope = [...new Set(config.scope)]

      // Redirect to Shopify Login page
      return sendRedirect(
        event,
        withQuery(discoveryResponse.authorization_endpoint, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
          code_challenge: verifier.code_challenge,
          code_challenge_method: verifier.code_challenge_method,
        }),
      )
    }

    const tokens: AccessTokenResponse = await requestAccessToken(discoveryResponse.token_endpoint, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        redirect_uri: redirectURL,
        code: query.code as string,
        code_verifier: verifier.code_verifier,
      },
    }).catch(() => ({ error: 'failed' }))

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'shopifyCustomer', tokens, onError)
    }

    // get api
    const apiDiscoveryUrl: CustomerApiDiscoveryResponse | null = await $fetch(`https://${config.shopDomain}/.well-known/customer-account-api`)
      .then(d => d as CustomerApiDiscoveryResponse)
      .catch(() => null)

    if (!apiDiscoveryUrl?.graphql_api) {
      const error = createError({
        statusCode: 400,
        message: 'Getting Shopify api endpoints failed.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const user: ShopifyCustomer | null = await $fetch(apiDiscoveryUrl.graphql_api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tokens.access_token,
      },
      body: JSON.stringify({
        operationName: 'getCustomer',
        query: 'query { customer { firstName lastName emailAddress { emailAddress }}}',
      }),
    }).then(d => (d as { data: ShopifyCustomer }).data)
      .catch(() => null)

    if (!user || !user.customer) {
      const error = createError({
        statusCode: 400,
        message: 'Getting Shopify Customer failed.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      tokens,
      user: user.customer,
    })
  })
}
