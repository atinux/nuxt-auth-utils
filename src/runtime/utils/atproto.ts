import type { ATProtoProvider, OAuthProvider } from '../types'
import type { AtprotoProviderClientMetadata } from '../types/atproto'

export const atprotoProviders = ['bluesky'] satisfies ATProtoProvider[]

export const atprotoProviderDefaultClientMetadata: AtprotoProviderClientMetadata = {
  clientMetadataFilename: '',
  clientName: '',
  clientUri: undefined,
  logoUri: undefined,
  policyUri: undefined,
  tosUri: undefined,
  scope: ['atproto'],
  grantTypes: ['authorization_code'],
  responseTypes: ['code'],
  applicationType: 'web',
  // @ts-ignore TypeScript is too smart for its own good
  redirectUris: undefined,
  dpopBoundAccessTokens: true as const,
  tokenEndpointAuthMethod: 'none',
}

export function getClientMetadataFilename(provider: OAuthProvider, config?: AtprotoProviderClientMetadata): string {
  return config?.clientMetadataFilename || provider + '/client-metadata.json'
}
