import type { OAuthClientMetadata } from '@atproto/oauth-client-node'

export interface AtprotoProviderClientMetadata {
  /**
   * The name of the client metadata file. This is used to construct the client ID.
   * @example 'client-metadata.json'
   * @example 'bluesky/client-metadata.json'
   */
  clientMetadataFilename: string

  /**
   * The human-readable name of the client.
   */
  clientName?: OAuthClientMetadata['client_name']

  /**
   * Not to be confused with client_id, this is a homepage URL for the client. If provided, the client_uri must have the same hostname as client_id.
   */
  clientUri?: OAuthClientMetadata['client_uri']

  /**
   * The client's logo URL.
   */
  logoUri?: OAuthClientMetadata['logo_uri']

  /**
   * URL to human-readable terms of service (ToS) for the client. Only https: URIs are allowed.
   */
  tosUri?: OAuthClientMetadata['tos_uri']

  /**
   * URL to human-readable privacy policy for the client. Only https: URIs are allowed.
   */
  policyUri?: OAuthClientMetadata['policy_uri']

  /**
   * Must be one of web or native, with web as the default if not specified. Note that this is field specified by OpenID/OIDC, which we are borrowing. Used by the Authorization Server to enforce the relevant "best current practices".
   * @default 'web'
   */
  applicationType?: OAuthClientMetadata['application_type']

  /**
   * `authorization_code` must always be included and will be added if missing. `refresh_token` is optional, but must be included if the client will make token refresh requests.
   * @default ['authorization_code']
   */
  grantTypes?: OAuthClientMetadata['grant_types']

  /**
   * All scope values which might be requested by this client are declared here. The atproto scope is required, and will be added if missing.
   * @default ['atproto']
   */
  scope?: NonNullable<OAuthClientMetadata['scope']>[]

  /**
   * `code` must always be included and will be added if missing.
   */
  responseTypes?: OAuthClientMetadata['response_types']

  /**
   * At least one redirect URI is required. The URL origin must match that of the `clientId`, so declare only the path.
   * @example ['/auth/callback']
   */
  redirectUris: OAuthClientMetadata['redirect_uris']

  /**
   * The token endpoint authentication method. `none` is the default, and the only supported value at this time.
   * @default 'none'
   */
  tokenEndpointAuthMethod?: OAuthClientMetadata['token_endpoint_auth_method']

  /**
   * DPoP is mandatory for all clients, so this must be present and true.
   */
  dpopBoundAccessTokens?: OAuthClientMetadata['dpop_bound_access_tokens']

  // @todo: add support for JWKS
}
