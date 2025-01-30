import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthGitHubConfig {
  /**
   * GitHub OAuth Client ID
   * @default process.env.NUXT_OAUTH_GITHUB_CLIENT_ID
   */
  clientId?: string
  /**
   * GitHub OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * GitHub OAuth Scope
   * @default []
   * @see https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
   * @example ['user:email']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['user:email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * GitHub OAuth Authorization URL
   * @default 'https://github.com/login/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * GitHub OAuth Token URL
   * @default 'https://github.com/login/oauth/access_token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#1-request-a-users-github-identity
   * @example { allow_signup: 'true' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_GITHUB_REDIRECT_URL
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
   */
  redirectURL?: string
}

export function defineOAuthGitHubEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthGitHubConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.github, {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      authorizationParams: {},
    }) as OAuthGitHubConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `GitHub login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'github', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('user:email')) {
        config.scope.push('user:email')
      }

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
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
      return handleAccessTokenErrorResponse(event, 'github', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://api.github.com/user', {
      headers: {
        'User-Agent': `Github-OAuth-${config.clientId}`,
        'Authorization': `token ${accessToken}`,
      },
    })

    // if no public email, check the private ones
    if (!user.email && config.emailRequired) {
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emails: any[] = await $fetch('https://api.github.com/user/emails', {
        headers: {
          'User-Agent': `Github-OAuth-${config.clientId}`,
          'Authorization': `token ${accessToken}`,
        },
      })
      // TODO: improve typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const primaryEmail = emails.find((email: any) => email.primary)
      // Still no email
      if (!primaryEmail) {
        const error = createError({
          statusCode: 500,
          message: 'Could not get GitHub user email',
          data: tokens,
        })
        if (!onError) throw error
        return onError(event, error)
      }
      user.email = primaryEmail.email
      user.email_verified = primaryEmail.verified
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
