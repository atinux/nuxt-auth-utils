import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, handleInvalidState, handleState, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthSpotifyConfig {
  /**
   * Spotify OAuth Client ID
   * @default process.env.NUXT_OAUTH_SPOTIFY_CLIENT_ID
   */
  clientId?: string
  /**
   * Spotify OAuth Client Secret
   * @default process.env.NUXT_OAUTH_SPOTIFY_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Spotify OAuth Scope
   * @default []
   * @see https://developer.spotify.com/documentation/web-api/concepts/scopes
   * @example ['playlist-read-private']
   */
  scope?: string[]

  /**
   * Spotify OAuth Authorization URL
   * @default 'https://accounts.spotify.com/authorize'
   */
  authorizationURL?: string

  /**
   * Spotify OAuth Token URL
   * @default 'https://accounts.spotify.com/api/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see 'https://developer.spotify.com/documentation/web-api/tutorials/code-flow'
   * @example { show_dialog: 'true' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_SPOTIFY_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

interface SpotifyUser {
  display_name: string
  external_urls: {
    spotify: string
  }
  href: string
  id: string
  images: {
    url: string
    height: number
    width: number
  }[]
  type: string
  uri: string
}

interface SpotifyTokens {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token: string
}

export function defineOAuthSpotifyEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthSpotifyConfig, { user: SpotifyUser, tokens: SpotifyTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.spotify, {
      authorizationURL: 'https://accounts.spotify.com/authorize',
      tokenURL: 'https://accounts.spotify.com/api/token',
      authorizationParams: {},
    }) as OAuthSpotifyConfig
    const query = getQuery<{ code?: string, state?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'spotify', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || []
      // Redirect to Spotify Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
          state,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'spotify', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: {
        client_id: config.clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'spotify', tokens, onError)
    }

    const accessToken = tokens.access_token

    const user = await $fetch<SpotifyUser>('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
