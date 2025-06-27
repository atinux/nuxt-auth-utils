import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthRobloxConfig {
  /**
   * Roblox OAuth Client ID
   * @default process.env.NUXT_OAUTH_ROBLOX_CLIENT_ID
   */
  clientId?: string
  /**
   * Roblox OAuth Client Secret
   * @default process.env.NUXT_OAUTH_ROBLOX_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Roblox OAuth Scope
   * Some scopes and claims listed are only available to official Roblox apps, e.g. email
   * @default ['openid', 'profile']
   * @see https://apis.roblox.com/oauth/.well-known/openid-configuration
   * @example ['openid', 'profile', 'asset:read', 'universe-messaging-service:publish']
   */
  scope?: string[]
  /**
   * Roblox OAuth Authorization URL
   * @default 'https://apis.roblox.com/oauth/v1/authorize'
   */
  authorizationURL?: string
  /**
   * Roblox OAuth Token URL
   * @default 'https://apis.roblox.com/oauth/v1/token'
   */
  tokenURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://create.roblox.com/docs/cloud/auth/oauth2-reference#get-v1authorize
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_ROBLOX_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

interface OAuthRobloxUserInfo {
  /**
   * Roblox unique user ID
   */
  sub: string

  /**
   * Display name (may be identical to username) - can be changed by the user
   * Available only with the profile scope
   */
  name?: string

  /**
   * Display name (may be identical to username) - can be changed by the user
   * Available only with the profile scope
   */
  nickname?: string

  /**
   * Unique username - can be changed by the user
   * Available only with the profile scope
   */
  preferred_username?: string

  /**
   * URL of the Roblox account profile
   * Available only with the profile scope
   */
  created_at?: string

  /**
   * Roblox avatar headshot image
   * Can be null if the avatar headshot image hasn't yet been generated or has been moderated
   * Available only with the profile scope
   */
  picture?: string | null
}

export interface OAuthRobloxUser {
  /**
   * The resource path of the user
   * @example "users/123"
   */
  path: string

  /**
   * The timestamp at which the user was created
   * @readonly
   * @example "2023-07-05T12:34:56Z"
   */
  createTime: string

  /**
   * Unique ID that identifies a user in Roblox
   * @readonly
   * @example "123456"
   */
  id: string

  /**
   * Unique username for a user in Roblox
   * @example "exampleUser"
   */
  name: string

  /**
   * Display name for the user
   * @example "userDefinedName"
   */
  displayName: string

  /**
   * User-defined information about themselves
   * @example "Example User's bio"
   */
  about: string

  /**
   * Current locale selected by the user as an IETF language code
   * @example "en-US"
   */
  locale: string

  /**
   * Whether the user is a premium user
   * @readonly
   * @example true
   */
  premium: boolean

  /**
   * Specifies if the user is identity-verified
   * Verification includes, but isn't limited to, non-VoIP phone numbers or government IDs
   * Available only with the user.advanced:read scope
   * @readonly
   * @example true
   */
  idVerified: boolean

  /**
   * User's social network profiles and visibility.
   */
  socialNetworkProfiles: {
    /**
     * Facebook profile URI.
     */
    facebook?: string

    /**
     * Twitter profile URI.
     */
    twitter?: string

    /**
     * YouTube profile URI.
     */
    youtube?: string

    /**
     * Twitch profile URI.
     */
    twitch?: string

    /**
     * Guilded profile URI.
     */
    guilded?: string

    /**
     * Visibility of the social network profiles.
     * Available only with the user.social:read scope
     * @example "SOCIAL_NETWORK_VISIBILITY_UNSPECIFIED"
     */
    visibility:
      | 'SOCIAL_NETWORK_VISIBILITY_UNSPECIFIED'
      | 'NO_ONE'
      | 'FRIENDS'
      | 'FRIENDS_AND_FOLLOWING'
      | 'FRIENDS_FOLLOWING_AND_FOLLOWERS'
      | 'EVERYONE'
  }
}

export function defineOAuthRobloxEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthRobloxConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.roblox, {
      authorizationURL: 'https://apis.roblox.com/oauth/v1/authorize',
      tokenURL: 'https://apis.roblox.com/oauth/v1/token',
      authorizationParams: {},
    }) as OAuthRobloxConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'roblox', ['clientId', 'clientSecret'], onError)
    }

    if (query.error) {
      return handleAccessTokenErrorResponse(event, 'roblox', query, onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []

      // Redirect to Roblox Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'roblox', tokens, onError)
    }

    const accessToken = tokens.access_token
    const userInfo: OAuthRobloxUserInfo = await $fetch('https://apis.roblox.com/oauth/userinfo', {
      headers: {
        'user-agent': 'Nuxt Auth Utils',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const user: OAuthRobloxUser = await $fetch(`https://apis.roblox.com/cloud/v2/users/${userInfo.sub}`, {
      headers: {
        'user-agent': 'Nuxt Auth Utils',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
