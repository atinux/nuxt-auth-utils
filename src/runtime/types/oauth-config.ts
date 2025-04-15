import type { H3Event, H3Error } from 'h3'

export type ATProtoProvider = 'bluesky'

export type OAuthProvider = ATProtoProvider | 'atlassian' | 'auth0' | 'authentik' | 'azureb2c' | 'battledotnet' | 'cognito' | 'discord' | 'dropbox' | 'facebook' | 'gitea' | 'github' | 'gitlab' | 'google' | 'hubspot' | 'instagram' | 'kick' | 'keycloak' | 'line' | 'linear' | 'linkedin' | 'microsoft' | 'paypal' | 'polar' | 'spotify' | 'seznam' | 'steam' | 'strava' | 'tiktok' | 'twitch' | 'vk' | 'workos' | 'x' | 'xsuaa' | 'yandex' | 'zitadel' | 'apple' | 'livechat' | 'salesforce' | 'slack' | 'heroku' | (string & {})

export type OnError = (event: H3Event, error: H3Error) => Promise<void> | void

export interface OAuthConfig<TConfig, TResult = { user: unknown, tokens: unknown }> {
  config?: TConfig
  onSuccess: (
    event: H3Event,
    result: TResult
  ) => Promise<void> | void
  onError?: OnError
}
