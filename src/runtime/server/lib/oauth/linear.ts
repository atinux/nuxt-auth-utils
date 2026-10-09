import type { RequestEvent } from 'nuxt/server'
import { defineEventHandler, createError, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, handleInvalidState, handleState, requestAccessToken } from '../utils'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthLinearConfig {
  /**
   * Linear OAuth Client ID
   * @default process.env.NUXT_OAUTH_LINEAR_CLIENT_ID
   */
  clientId?: string
  /**
   * Linear OAuth Client Secret
   * @default process.env.NUXT_OAUTH_LINEAR_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Linear OAuth Scope
   * @default ['read']
   * @see https://developers.linear.app/docs/oauth/authentication#scopes
   * @example ['read', 'write', 'issues:create', 'comments:create', 'timeSchedule:write', 'admin']
   */
  scope?: string[]
  /**
   * Linear OAuth Authorization URL
   * @default 'https://linear.app/oauth/authorize'
   */
  authorizationURL?: string
  /**
   * Linear OAuth Token URL
   * @default 'https://api.linear.app/oauth/token'
   */
  tokenURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.linear.app/docs/oauth/authentication#id-2.-redirect-user-access-requests-to-linear
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_LINEAR_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthLinearEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthLinearConfig>) {
  return defineEventHandler(async (event: RequestEvent) => {
    config = defu(config, useRuntimeConfig().oauth?.linear, {
      authorizationURL: 'https://linear.app/oauth/authorize',
      tokenURL: 'https://api.linear.app/oauth/token',
      authorizationParams: {},
    }) as OAuthLinearConfig

    const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        status: 401,
        message: `Linear login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'linear', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || ['read']
      // Redirect to Linear OAuth page
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
      return handleInvalidState(event, 'linear', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'linear', tokens, onError)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ viewer { id name email } }',
      }),
    })

    if (!user.data || !user.data.viewer) {
      const error = createError({
        status: 500,
        message: 'Could not get Linear user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      tokens,
      user: user.data.viewer,
    })
  })
}
