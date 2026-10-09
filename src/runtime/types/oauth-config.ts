import type { NuxtError, RequestEvent } from 'nuxt/server'

export type ATProtoProvider = 'bluesky'

export type OAuthProvider = ATProtoProvider | 'atlassian' | 'auth0' | 'authentik' | 'azureb2c' | 'battledotnet' | 'cognito' | 'discord' | 'dropbox' | 'facebook' | 'gitea' | 'github' | 'gitlab' | 'google' | 'hubspot' | 'instagram' | 'kick' | 'keycloak' | 'line' | 'linear' | 'linkedin' | 'microsoft' | 'paypal' | 'polar' | 'spotify' | 'seznam' | 'steam' | 'strava' | 'tiktok' | 'twitch' | 'vk' | 'workos' | 'x' | 'xsuaa' | 'yandex' | 'zitadel' | 'apple' | 'livechat' | 'salesforce' | 'slack' | 'heroku' | 'roblox' | 'okta' | 'ory' | 'shopifyCustomer' | 'oidc' | 'osu' | 'riotgames' | 'box' | (string & {})

export type OnError = (event: RequestEvent, error: NuxtError) => unknown

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OAuthConfig<TConfig, TResult = { user: any, tokens: any }> {
  config?: TConfig
  onSuccess: (
    event: RequestEvent,
    result: TResult,
  ) => unknown
  onError?: OnError
}
