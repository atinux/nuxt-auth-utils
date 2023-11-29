import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parseURL, stringifyParsedURL } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'

export interface OAuthLinkedInConfig {
  /**
   * LinkedIn OAuth Client ID
   * @default process.env.NUXT_OAUTH_LINKEDIN_CLIENT_ID
   */
  clientId?: string
  /**
   * LinkedIn OAuth Client Secret
   * @default process.env.NUXT_OAUTH_LINKEDIN_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * LinkedIn OAuth Scope
   * @default []
   * @example ['openid', 'profile', 'email']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['user:email'] scope if not present
   * @default false
   */
    emailRequired?: boolean

  /**
   * LinkedIn OAuth Authorization URL
   * @default 'https://www.linkedin.com/oauth/v2/authorization'
   */
  authorizationURL?: string
  /**
   * LinkedIn OAuth Token URL
   * @default 'https://www.linkedin.com/oauth/v2/accessToken'
   */
  tokenURL?: string
}

interface OAuthConfig {
  config?: OAuthLinkedInConfig
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function linkedinEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.linkedin, {
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    }) as OAuthLinkedInConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_LINKEDIN_CLIENT_ID or NUXT_OAUTH_LINKEDIN_CLIENT_SECRET env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
        if (!config.scope.includes('profile')) {
          config.scope.push('profile')
        }
        if (!config.scope.includes('openid')) {
          config.scope.push('openid')
        }
      }
      // Redirect to LinkedIn Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' ')
        })
      )
    }

    const parsedRedirectUrl = parseURL(redirectUrl)
    parsedRedirectUrl.search = ''
    const tokens: any = await ofetch(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: stringifyParsedURL(parsedRedirectUrl),
        }).toString()
      }
    ).catch(error => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `LinkedIn login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    const user: any = await ofetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'user-agent': 'Nuxt Auth Utils',
        Authorization: `Bearer ${accessToken}`
      }
    })

    return onSuccess(event, {
      tokens,
      user
    })
  })
}
