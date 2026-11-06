import type { AtprotoProviderClientMetadata } from './atproto'
import type { OAuthRuntimeConfigExtension } from './oauth-config'
import type { LiveChatConfig } from '../server/lib/oauth/livechat'
import type { OAuthAppleConfig } from '../server/lib/oauth/apple'
import type { OAuthAtlassianConfig } from '../server/lib/oauth/atlassian'
import type { OAuthAuth0Config } from '../server/lib/oauth/auth0'
import type { OAuthAuthentikConfig } from '../server/lib/oauth/authentik'
import type { OAuthAzureB2CConfig } from '../server/lib/oauth/azureb2c'
import type { OAuthBattledotnetConfig } from '../server/lib/oauth/battledotnet'
import type { OAuthBoxConfig } from '../server/lib/oauth/box'
import type { OAuthCloudflareConfig } from '../server/lib/oauth/cloudflare'
import type { OAuthCognitoConfig } from '../server/lib/oauth/cognito'
import type { OAuthDiscordConfig } from '../server/lib/oauth/discord'
import type { OAuthDropboxConfig } from '../server/lib/oauth/dropbox'
import type { OAuthFacebookConfig } from '../server/lib/oauth/facebook'
import type { OAuthGitHubConfig } from '../server/lib/oauth/github'
import type { OAuthGitLabConfig } from '../server/lib/oauth/gitlab'
import type { OAuthGiteaConfig } from '../server/lib/oauth/gitea'
import type { OAuthGoogleConfig } from '../server/lib/oauth/google'
import type { OAuthHerokuConfig } from '../server/lib/oauth/heroku'
import type { OAuthHubspotConfig } from '../server/lib/oauth/hubspot'
import type { OAuthInstagramConfig } from '../server/lib/oauth/instagram'
import type { OAuthKeycloakConfig } from '../server/lib/oauth/keycloak'
import type { OAuthKickConfig } from '../server/lib/oauth/kick'
import type { OAuthLineConfig } from '../server/lib/oauth/line'
import type { OAuthLinearConfig } from '../server/lib/oauth/linear'
import type { OAuthLinkedInConfig } from '../server/lib/oauth/linkedin'
import type { OAuthMastodonConfig } from '../server/lib/oauth/mastodon'
import type { OAuthMicrosoftConfig } from '../server/lib/oauth/microsoft'
import type { OAuthOidcConfig } from '../server/lib/oauth/oidc'
import type { OAuthOktaConfig } from '../server/lib/oauth/okta'
import type { OAuthOryConfig } from '../server/lib/oauth/ory'
import type { OAuthOsuConfig } from '../server/lib/oauth/osu'
import type { OAuthPaypalConfig } from '../server/lib/oauth/paypal'
import type { OAuthPolarConfig } from '../server/lib/oauth/polar'
import type { OAuthRiotGamesConfig } from '../server/lib/oauth/riotgames'
import type { OAuthRobloxConfig } from '../server/lib/oauth/roblox'
import type { OAuthSalesforceConfig } from '../server/lib/oauth/salesforce'
import type { OAuthSeznamConfig } from '../server/lib/oauth/seznam'
import type { OAuthShopifyCustomerConfig } from '../server/lib/oauth/shopifyCustomer'
import type { OAuthSlackConfig } from '../server/lib/oauth/slack'
import type { OAuthSpotifyConfig } from '../server/lib/oauth/spotify'
import type { OAuthSteamConfig } from '../server/lib/oauth/steam'
import type { OAuthStravaConfig } from '../server/lib/oauth/strava'
import type { OAuthTikTokConfig } from '../server/lib/oauth/tiktok'
import type { OAuthTwitchConfig } from '../server/lib/oauth/twitch'
import type { OAuthVKConfig } from '../server/lib/oauth/vk'
import type { OAuthWechatConfig } from '../server/lib/oauth/wechat'
import type { OAuthWorkOSConfig } from '../server/lib/oauth/workos'
import type { OAuthXConfig } from '../server/lib/oauth/x'
import type { OAuthXSUAAConfig } from '../server/lib/oauth/xsuaa'
import type { OAuthYandexConfig } from '../server/lib/oauth/yandex'
import type { OAuthZendeskConfig } from '../server/lib/oauth/zendesk'
import type { OAuthZitadelConfig } from '../server/lib/oauth/zitadel'

/**
 * Runtime configuration of every OAuth provider supported by the module, exposed as `runtimeConfig.oauth`.
 *
 * Keys are the provider names accepted by `defineOAuth<Provider>EventHandler()`, and they are always
 * set by the module, so server code can read them without checking for `undefined`. In `nuxt.config`,
 * `runtimeConfig` is deep-partial, so you only write the providers you use.
 * Providers contributed by other modules can add themselves through the `OAuthRuntimeConfigExtension`
 * interface, and any other key stays `unknown`.
 */
export interface OAuthRuntimeConfig extends OAuthRuntimeConfigExtension {
  [provider: string]: unknown
  apple: OAuthAppleConfig
  atlassian: OAuthAtlassianConfig
  auth0: OAuthAuth0Config
  authentik: OAuthAuthentikConfig
  azureb2c: OAuthAzureB2CConfig
  battledotnet: OAuthBattledotnetConfig
  bluesky: AtprotoProviderClientMetadata
  box: OAuthBoxConfig
  cloudflare: OAuthCloudflareConfig
  cognito: OAuthCognitoConfig
  discord: OAuthDiscordConfig
  dropbox: OAuthDropboxConfig
  facebook: OAuthFacebookConfig
  gitea: OAuthGiteaConfig
  github: OAuthGitHubConfig
  gitlab: OAuthGitLabConfig
  google: OAuthGoogleConfig
  heroku: OAuthHerokuConfig
  hubspot: OAuthHubspotConfig
  instagram: OAuthInstagramConfig
  keycloak: OAuthKeycloakConfig
  kick: OAuthKickConfig
  line: OAuthLineConfig
  linear: OAuthLinearConfig
  linkedin: OAuthLinkedInConfig
  livechat: LiveChatConfig
  mastodon: OAuthMastodonConfig
  microsoft: OAuthMicrosoftConfig
  oidc: OAuthOidcConfig
  okta: OAuthOktaConfig
  ory: OAuthOryConfig
  osu: OAuthOsuConfig
  paypal: OAuthPaypalConfig
  polar: OAuthPolarConfig
  riotgames: OAuthRiotGamesConfig
  roblox: OAuthRobloxConfig
  salesforce: OAuthSalesforceConfig
  seznam: OAuthSeznamConfig
  shopifyCustomer: OAuthShopifyCustomerConfig
  slack: OAuthSlackConfig
  spotify: OAuthSpotifyConfig
  steam: OAuthSteamConfig
  strava: OAuthStravaConfig
  tiktok: OAuthTikTokConfig
  twitch: OAuthTwitchConfig
  vk: OAuthVKConfig
  wechat: OAuthWechatConfig
  workos: OAuthWorkOSConfig
  x: OAuthXConfig
  xsuaa: OAuthXSUAAConfig
  yandex: OAuthYandexConfig
  zendesk: OAuthZendeskConfig
  zitadel: OAuthZitadelConfig
}
