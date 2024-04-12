import type { H3Event } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
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
}

export function githubEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthGitHubConfig>) {
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
      const redirectUrl = getRequestURL(event).href
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(
      config.tokenURL as string,
      {
        method: 'POST',
        body: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: query.code,
        },
      },
    )
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `GitHub login failed: ${tokens.error || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await ofetch('https://api.github.com/user', {
      headers: {
        'User-Agent': `Github-OAuth-${config.clientId}`,
        'Authorization': `token ${accessToken}`,
      },
    })

    // if no public email, check the private ones
    if (!user.email && config.emailRequired) {
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emails: any[] = await ofetch('https://api.github.com/user/emails', {
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
        throw new Error('GitHub login failed: no user email found')
      }
      user.email = primaryEmail.email
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
