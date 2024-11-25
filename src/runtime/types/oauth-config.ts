import type { H3Event, H3Error } from 'h3'

export type OAuthProvider = 'auth0' | 'authentik' | 'battledotnet' | 'cognito' | 'discord' | 'dropbox' | 'facebook' | 'github' | 'gitlab' | 'google' | 'instagram' | 'keycloak' | 'linear' | 'linkedin' | 'microsoft' | 'paypal' | 'polar' | 'spotify' | 'seznam' | 'steam' | 'strava' | 'tiktok' | 'twitch' | 'vk' | 'workos' | 'x' | 'xsuaa' | 'yandex' | 'zitadel' | (string & {})

export type OnError = (event: H3Event, error: H3Error) => Promise<void> | void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OAuthConfig<TConfig, TUser = any, TTokens = any> {
  config?: TConfig
  onSuccess: (
    event: H3Event,
    result: { user: TUser, tokens: TTokens }
  ) => Promise<void> | void
  onError?: OnError
}
