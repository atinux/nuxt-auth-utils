import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parseURL, stringifyParsedURL } from 'ufo'
import { defu } from 'defu'
import { handleAccessTokenErrorResponse } from '../utils'
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
   * @default ['openid', 'profile', 'email']
   * @example ['openid', 'profile']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
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
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow?context=linkedin/context
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_LINKEDIN_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

interface OAuthConfig {
  config?: OAuthLinkedInConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function oauthLinkedInEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.linkedin, {
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      authorizationParams: {},
    }) as OAuthLinkedInConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_LINKEDIN_CLIENT_ID or NUXT_OAUTH_LINKEDIN_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || []
      if (!config.scope.length) {
        config.scope.push('profile', 'openid', 'email')
      }
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }
      // Redirect to LinkedIn Oauth page
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

    const parsedRedirectUrl = parseURL(redirectURL)
    parsedRedirectUrl.search = ''
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: stringifyParsedURL(parsedRedirectUrl),
        }).toString(),
      },
    ).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'linkedin', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://api.linkedin.com/v2/userinfo', {
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
