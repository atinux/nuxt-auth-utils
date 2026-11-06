import type { RequestEvent } from 'nuxt/server'
import type { OAuthClientMetadataInput, OAuthGrantType } from '@atproto/oauth-client-node'
import { getRequestURL, useRuntimeConfig } from 'nuxt/server'
import { withBase } from 'ufo'
import type { AtprotoProviderClientMetadata } from '../../types/atproto'
import type { OAuthBlueskyConfig } from '../lib/atproto/bluesky'
import { getClientMetadataFilename } from '../../utils/atproto'
import type { ATProtoProvider, OAuthConfig } from '#auth-utils'

export function getAtprotoClientMetadata(
  event: RequestEvent,
  provider: ATProtoProvider,
  config?: OAuthConfig<OAuthBlueskyConfig>['config'],
): OAuthClientMetadataInput {
  const runtimeConfig = useRuntimeConfig()
  const providerRuntimeConfig: AtprotoProviderClientMetadata = runtimeConfig.oauth[provider] as AtprotoProviderClientMetadata
  const scopes = [...new Set(['atproto', ...config?.scope ?? [], ...providerRuntimeConfig.scope ?? []])]
  const scope = scopes.join(' ')

  const grantTypes = [...new Set(['authorization_code', ...providerRuntimeConfig.grantTypes ?? []])] as [OAuthGrantType, ...OAuthGrantType[]]

  const requestURL = getRequestURL(event, { xForwardedProto: true })
  const baseUrl = `${requestURL.protocol}//${requestURL.host}`

  // Routes are served under the app base URL, which can be set at runtime (`NUXT_APP_BASE_URL`),
  // so callback paths are resolved against it here rather than baked into the runtime config.
  // A path that already starts with the base URL is left as is.
  const withAppBase = (path: string) => withBase(path, runtimeConfig.app.baseURL)
  const callbackPaths = (providerRuntimeConfig.redirectUris?.length ? providerRuntimeConfig.redirectUris : [`/auth/${provider}`]).map(withAppBase)

  /**
   * The redirect URL must be a valid URL, so we need to parse it to ensure it is correct. Will use the following order:
   * 1. URL provided as part of the config of the event handler. It must also be listed in the redirect URIs, which is not checked here.
   * 2. First redirect URI, from the runtime config or the conventional callback path.
   */
  const redirectURL = new URL(baseUrl + (config?.redirectUrl ? withAppBase(config.redirectUrl) : callbackPaths[0]))

  const dev = import.meta.dev
  if (dev && redirectURL.hostname === 'localhost') {
    // For local development, Bluesky authorization servers allow "http://127.0.0.1" as a special value for redirect URIs
    redirectURL.hostname = '127.0.0.1'
  }
  const redirectUris = callbackPaths
    .map(uri => new URL(`${redirectURL.protocol}//${redirectURL.host}${uri}`).toString()) as [string, ...string[]]

  const clientId = dev
    // For local development, Bluesky authorization servers allow "http://localhost" as a special value for the client
    ? `http://localhost?redirect_uri=${encodeURIComponent(redirectURL.toString())}&scope=${encodeURIComponent(scope)}`
    : `${baseUrl}${withBase(`/${getClientMetadataFilename(provider, providerRuntimeConfig)}`, runtimeConfig.app.baseURL)}`

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
