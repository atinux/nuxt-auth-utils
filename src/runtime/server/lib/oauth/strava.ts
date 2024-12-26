import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  getOAuthRedirectURL,
  handleAccessTokenErrorResponse,
  handleMissingConfiguration,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthStravaConfig {
  /**
   * Strava OAuth Client ID
   * @default process.env.NUXT_OAUTH_STRAVA_CLIENT_ID
   */
  clientId?: string

  /**
   * Strava OAuth Client Secret
   * @default process.env.NUXT_OAUTH_STRAVA_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Strava OAuth Scope
   * @default []
   * @see https://developers.strava.com/docs/authentication/ # Details About Requesting Access
   * @example ['read', 'read_all', 'profile:read_all', 'profile:write', 'activity:read', 'activity:read_all', 'activity:write']
   */
  scope?: string[]

  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_STRAVA_REDIRECT_URL or current URL
   */
  redirectURL?: string

  /**
   * To show the authorization prompt to the user, 'force' will always show the prompt
   * @default 'auto'
   * @see https://developers.strava.com/docs/authentication/ # Details About Requesting Access
   */
  approvalPrompt?: 'auto' | 'force'
}

export interface OAuthStravaUser {
  /**
   * The unique identifier of the athlete
   */
  id: number

  /**
   * The username of the athlete
   */
  username: string

  /**
   * Resource state, indicates level of detail.
   * - Meta (1): Basic information
   * - Summary (2): Summary information
   * - Detail (3): Detailed information
   * @see https://developers.strava.com/docs/reference/#api-models-DetailedAthlete
   */
  resource_state: 1 | 2 | 3

  /**
   * The athlete's first name
   */
  firstname: string

  /**
   * The athlete's last name
   */
  lastname: string

  /**
   * The athlete's bio
   */
  bio: string

  /**
   * The athlete's city
   */
  city: string

  /**
   * The athlete's state or geographical region
   */
  state: string

  /**
   * The athlete's country
   */
  country: string

  /**
   * The athlete's sex
   */
  sex: string

  /**
   * Whether the athlete has any Summit subscription
   * @see https://developers.strava.com/docs/reference/#api-models-DetailedAthlete
   */
  summit: boolean

  /**
   * The time at which the athlete was created
   */
  created_at: Date

  /**
   * The time at which the athlete was last updated
   */
  updated_at: Date

  /**
   * The athlete's weight
   */
  weight: number

  /**
   * URL to a 124x124 pixel profile picture
   */
  profile_medium: string

  /**
   * URL to a 62x62 pixel profile picture
   */
  profile: string

  /**
   * The athlete's timezone
   */
  timezone: string
}

export interface OAuthStravaTokens {
  token_type: 'Bearer'
  expires_at: number
  expires_in: number
  access_token: string
  refresh_token: string
  athlete: OAuthStravaUser
  error?: string
}

export function defineOAuthStravaEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthStravaConfig, OAuthStravaUser>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.strava) as OAuthStravaConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Strava login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'strava',
        ['clientId', 'clientSecret'],
        onError,
      )
    }

    const authorizationURL = 'https://www.strava.com/oauth/authorize'
    const tokenURL = 'https://www.strava.com/oauth/token'
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      // Redirect to Strava login page
      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          response_type: 'code',
          approval_prompt: config.approvalPrompt || 'auto',
          scope: config.scope,
        }),
      )
    }

    const tokens: OAuthStravaTokens = await requestAccessToken(tokenURL, {
      body: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: query.code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'strava', tokens, onError)
    }

    const user: OAuthStravaUser = await $fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
