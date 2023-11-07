import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'

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
}

interface OAuthConfig {
  config?: OAuthGitHubConfig
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function githubEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.github, {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token'
    }) as OAuthGitHubConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_GITHUB_CLIENT_ID or NUXT_OAUTH_GITHUB_CLIENT_SECRET env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!code) {
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
          scope: config.scope.join('%20')
        })
      )
    }

    const tokens: any = await $fetch(
      config.tokenURL as string,
      {
        method: 'POST',
        body: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code
        }
      }
    )
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `GitHub login failed: ${tokens.error || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    const user: any = await ofetch('https://api.github.com/user', {
      headers: {
        'User-Agent': `Github-OAuth-${config.clientId}`,
        Authorization: `token ${accessToken}`
      }
    })

    // if no public email, check the private ones
    if (!user.email && config.emailRequired) {
      const emails: any[] = await ofetch('https://api.github.com/user/emails', {
        headers: {
          'User-Agent': `Github-OAuth-${config.clientId}`,
          Authorization: `token ${accessToken}`
        }
      })
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
