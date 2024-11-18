import type { H3Event } from 'h3'
import type { OAuthClientMetadataInput, OAuthGrantType } from '@atproto/oauth-client-node'
import type { AtprotoProviderClientMetadata } from '../../types/atproto'
import type { OAuthBlueskyConfig } from '../lib/oauth/bluesky'
import { getOAuthRedirectURL } from '../lib/utils'
import type { OAuthConfig, OAuthProvider } from '#auth-utils'
import { getRequestURL, useRuntimeConfig } from '#imports'

export function getAtprotoClientMetadata(
  event: H3Event,
  provider: OAuthProvider,
  config?: OAuthConfig<OAuthBlueskyConfig>['config'],
): OAuthClientMetadataInput {
  const providerRuntimeConfig: AtprotoProviderClientMetadata = useRuntimeConfig(event).oauth[provider] as AtprotoProviderClientMetadata
  const scopes = [...new Set(['atproto', ...config?.scope ?? [], ...providerRuntimeConfig.scope ?? []])]
  const scope = scopes.join(' ')

  const grantTypes = [...new Set(['authorization_code', ...providerRuntimeConfig.grantTypes ?? []])] as [OAuthGrantType, ...OAuthGrantType[]]

  const requestURL = getRequestURL(event)
  const baseUrl = `${requestURL.protocol}//${requestURL.host}`

  /**
   * The redirect URL must be a valid URL, so we need to parse it to ensure it is correct. Will use the following order:
   * 1. URL provided as part of the config of the event handler, on the condition that it was listed in the redirect URIs.
   * 2. First URL provided in the runtime config.
   * 3. The URL of the current request.
   */
  const redirectURL = new URL(
    (config?.redirectUrl && baseUrl + config.redirectUrl)
    || (providerRuntimeConfig.redirectUris[0] && baseUrl + providerRuntimeConfig.redirectUris[0])
    || getOAuthRedirectURL(event),
  )

  const dev = import.meta.dev
  if (dev && redirectURL.hostname === 'localhost') {
    // For local development, Bluesky authorization servers allow "http://127.0.0.1" as a special value for redirect URIs
    redirectURL.hostname = '127.0.0.1'
  }
  const redirectUris = (providerRuntimeConfig.redirectUris.length ? providerRuntimeConfig.redirectUris : [requestURL.pathname])
    .map(uri => new URL(`${redirectURL.protocol}//${redirectURL.host}${uri}`).toString()) as [string, ...string[]]

  const clientId = dev
    // For local development, Bluesky authorization servers allow "http://localhost" as a special value for the client
    ? `http://localhost?redirect_uri=${encodeURIComponent(redirectURL.toString())}&scope=${encodeURIComponent(scope)}`
    : `${baseUrl}/${providerRuntimeConfig.clientMetadataFilename || provider + '/client-metadata.json'}`

  const clientMetadata: OAuthClientMetadataInput = {
    client_name: providerRuntimeConfig.clientName || undefined,
    client_uri: providerRuntimeConfig.clientUri || undefined,
    logo_uri: providerRuntimeConfig.logoUri || undefined,
    policy_uri: providerRuntimeConfig.policyUri || undefined,
    tos_uri: providerRuntimeConfig.tosUri || undefined,
    client_id: clientId,
    redirect_uris: redirectUris,
    scope,
    grant_types: grantTypes,
    application_type: providerRuntimeConfig.applicationType,
    token_endpoint_auth_method: providerRuntimeConfig.tokenEndpointAuthMethod,
    dpop_bound_access_tokens: true,
  }

  return clientMetadata
}
