import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthGitLabConfig {
  /**
   * GitLab OAuth Client ID
   * @default process.env.NUXT_OAUTH_GITLAB_CLIENT_ID
   */
  clientId?: string
  /**
   * GitLab OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GITLAB_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * GitLab OAuth Scope
   * @default ['read_user']
   * @see https://docs.gitlab.com/ee/integration/oauth_provider.html#view-all-authorized-applications
   * @example ['read_user']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * GitLab OAuth Authorization URL
   * @default 'https://gitlab.com/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * GitLab OAuth Token URL
   * @default 'https://gitlab.com/oauth/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.gitlab.com/ee/integration/oauth_provider.html#view-all-authorized-applications
   * @example { allow_signup: 'true' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_GITLAB_REDIRECT_URL
   */
  redirectURL?: string
}

export function oauthGitLabEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthGitLabConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.gitlab, {
      authorizationURL: 'https://gitlab.com/oauth/authorize',
      tokenURL: 'https://gitlab.com/oauth/token',
      authorizationParams: {},
    }) as OAuthGitLabConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `GitLab login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'gitlab',
        ['clientId', 'clientSecret'],
        onError,
      )
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (!config.scope.length) {
        config.scope.push('read_user')
      }
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }

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
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'gitlab', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://gitlab.com/api/v4/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
