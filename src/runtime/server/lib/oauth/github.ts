import type { H3Event, EventHandler } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig, OAuthToken, OAuthUser, OAuthAccessTokenSuccess, OAuthAccessTokenError } from '#auth-utils'

/**
 * GitHub User
 *
 * @see https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
 */
type GitHubUser = {
  login: string
  id: number
  node_id: string
  avatar_url: string
  name: string
  email: string

  [key: string]: unknown
}

/**
 * GitHub Email
 *
 * @see https://docs.github.com/en/rest/users/emails?apiVersion=2022-11-28#list-email-addresses-for-the-authenticated-user
 */
type GitHubEmail = {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

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

export function oauthGitHubEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthGitHubConfig, GitHubUser>): EventHandler {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.github, {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      authorizationParams: {},
    }) as OAuthGitHubConfig
    const query = getQuery(event)

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
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_GITHUB_CLIENT_ID or NUXT_OAUTH_GITHUB_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!query.code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('user:email')) {
        config.scope.push('user:email')
      }
      // Redirect to GitHub Oauth page
      const redirectURL = config.redirectURL || getRequestURL(event).href
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

    const tokens = await $fetch<unknown>(
      config.tokenURL as string,
      {
        method: 'POST',
        body: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: query.code,
        },
      },
    ).catch((error) => {
      return { error }
    })

    if ((tokens as OAuthAccessTokenError).error) {
      const error = createError({
        statusCode: 401,
        message: `GitHub login failed: ${(tokens as OAuthAccessTokenError).error || 'Unknown error'}`,
        data: tokens as OAuthAccessTokenError,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = (tokens as OAuthAccessTokenSuccess).access_token
    const user = await $fetch<GitHubUser>('https://api.github.com/user', {
      headers: {
        'User-Agent': `Github-OAuth-${config.clientId}`,
        'Authorization': `token ${accessToken}`,
      },
    })

    // if no public email, check the private ones
    if (!user.email && config.emailRequired) {
      const emails = await $fetch<GitHubEmail[]>('https://api.github.com/user/emails', {
        headers: {
          'User-Agent': `Github-OAuth-${config.clientId}`,
          'Authorization': `token ${accessToken}`,
        },
      })
      const primaryEmail = emails.find(email => email.primary)
      // Still no email
      if (!primaryEmail) {
        throw new Error('GitHub login failed: no user email found')
      }
      user.email = primaryEmail.email
    }

    return onSuccess(event, {
      user: normalizeGitHubUser(user),
      tokens: normalizeGitHubToken(tokens as OAuthAccessTokenSuccess),
    })
  })
}

function normalizeGitHubUser(user: GitHubUser): OAuthUser<GitHubUser> {
  return {
    id: user.id,
    nickname: user.login,
    name: user.name,
    email: user.email,
    avatar: user.avatar_url,
    raw: user,
  }
}

function normalizeGitHubToken(tokens: OAuthAccessTokenSuccess): OAuthToken {
  return {
    token: tokens.access_token,
    approvedScopes: tokens.scope?.split(','),
  }
}
