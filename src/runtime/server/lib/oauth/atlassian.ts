import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

interface AtlassianUser {
  account_id?: string // 000000-X0X0X0X0-X0X0-X0X0-X0X0-X0X0X0X0X0X0
  email?: string // @example john.doe@example.com
  name?: string // @example John Doe
  picture?: string // @example https://secure.gravatar.com/avatar/xxx
  account_status?: string // @example active | inactive
  characteristics?: { not_mentionable?: boolean }
  last_updated?: string // @example 2024-10-13T15:35:16.933Z
  nickname?: string // @example John Doe
  locale?: string // @example en-US
  extended_profile?: { phone_numbers?: string[] }
  account_type?: string // @example atlassian
  email_verified?: boolean // @example true
}

interface AtlassianTokens {
  access_token?: string // JWT
  expires_in?: number // seconds
  token_type?: string // @example Bearer
  scope?: string // @example 'read:account read:me'
  error?: string
}

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps
 */
export interface OAuthAtlassianConfig {
  /**
   * Atlassian OAuth Client ID
   * @default process.env.NUXT_OAUTH_ATLASSIAN_CLIENT_ID
   * @see https://developer.atlassian.com/console/myapps
   */
  clientId?: string
  /**
   * Atlassian OAuth Client Secret
   * @default process.env.NUXT_OAUTH_ATLASSIAN_CLIENT_SECRET
   * @see https://developer.atlassian.com/console/myapps
   */
  clientSecret?: string
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_ATLASSIAN_REDIRECT_URL or current URL
   * @see https://developer.atlassian.com/console/myapps
   */
  redirectURL?: string
  /**
   * Atlassian OAuth Scope
   * @default ['read:me', 'read:account']
   * @see [Jira scopes](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps) | [Confluence scopes](https://developer.atlassian.com/cloud/confluence/scopes-for-oauth-2-3LO-and-forge-apps)
   *
   * @example
   * User identity API: ['read:me', 'read:account']
   * Confluence API: ['read:confluence-user']
   * BRIE API: ['read:account:brie]
   * Jira platform REST API: ['read:jira-user']
   * Personal data reporting API: ['report:personal-data']
   */
  scope?: string[]
  /**
   * Atlassian OAuth Audience URL
   * @default 'https://api.atlassian.com'
   */
  audienceURL?: string
  /**
   * Atlassian OAuth Authorization URL
   * @default 'https://auth.atlassian.com/authorize'
   */
  authorizationURL?: string
  /**
   * Atlassian OAuth Token URL
   * @default 'https://auth.atlassian.com/oauth/token'
   */
  tokenURL?: string
  /**
   * Require email from user, adds the ['read:me'] scope if not present
   * @default false
   */
  emailHasToBeVerified?: boolean
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @default {}
   */
  authorizationParams?: Record<string, string>
}

/**
 * Atlassian User identity, Confluence, BRIE, Jira platform, Atlassian Personal data reporting
 */
export function defineOAuthAtlassianEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthAtlassianConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig().oauth?.atlassian, {
      authorizationURL: 'https://auth.atlassian.com/authorize',
      tokenURL: 'https://auth.atlassian.com/oauth/token',
      audienceURL: 'https://api.atlassian.com',
      scope: ['read:me', 'read:account'],
      authorizationParams: {},
    }) as OAuthAtlassianConfig

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'atlassian', ['clientId', 'clientSecret'], onError)
    }

    if (config.scope?.length === 0) {
      config.scope = ['read:me']
    }

    if (config.emailHasToBeVerified && !config.scope?.includes('read:me')) {
      config.scope?.push('read:me')
    }

    const query = getQuery<{ code?: string, error?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          audience: config.audienceURL,
          client_id: config.clientId,
          scope: config.scope?.join(' '),
          redirect_uri: redirectURL,
          state: randomUUID(),
          response_type: 'code',
          prompt: 'consent',
          ...config.authorizationParams,
        }),
      )
    }

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Atlassian login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokens: AtlassianTokens = await requestAccessToken(config.tokenURL as string, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: query.code,
        redirect_uri: redirectURL,
      },
    })

    if (tokens.error || !tokens.access_token) {
      return handleAccessTokenErrorResponse(event, 'atlassian', tokens, onError)
    }

    const user = await $fetch<AtlassianUser>('https://api.atlassian.com/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (user.account_status === 'inactive') {
      const error = createError({
        statusCode: 403,
        statusMessage: 'Atlassian account is inactive',
        data: { accountStatus: user.account_status },
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!user.email_verified) {
      const error = createError({
        statusCode: 400,
        statusMessage: 'Email address is not verified',
        data: { email: user.email },
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
