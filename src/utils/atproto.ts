import type { ATProtoProvider, OAuthProvider } from '../runtime/types'
import type { AtprotoProviderClientMetadata } from '../runtime/types/atproto'

export const atprotoProviders = ['bluesky'] satisfies ATProtoProvider[]

export const atprotoProviderDefaultClientMetadata: AtprotoProviderClientMetadata = {
  clientMetadataFilename: '',
  clientName: '',
  clientUri: '',
  logoUri: '',
  policyUri: '',
  tosUri: '',
  scope: ['atproto'],
  grantTypes: ['authorization_code'],
  responseTypes: ['code'],
  applicationType: 'web',
  redirectUris: [] as unknown as [string, ...string[]],
  dpopBoundAccessTokens: true as const,
  tokenEndpointAuthMethod: 'none',
}

export function getClientMetadataFilename(provider: OAuthProvider, config?: AtprotoProviderClientMetadata): string {
  return config?.clientMetadataFilename || provider + '/client-metadata.json'
}
