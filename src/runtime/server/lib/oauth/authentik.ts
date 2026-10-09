import type { RequestEvent } from 'nuxt/server'
import { defineEventHandler, createError, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, handleInvalidState, handleState, requestAccessToken } from '../utils'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthAuthentikConfig {
  /**
   * Authentik OAuth Client ID
   * @default process.env.NUXT_OAUTH_AUTHENTIK_CLIENT_ID
   */
  clientId?: string
  /**
   * Authentik OAuth Client Secret
   * @default process.env.NUXT_OAUTH_AUTHENTIK_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Authentik OAuth Domain
   * @example https://<your-authentik-instance>
   * @default process.env.NUXT_OAUTH_AUTHENTIK_DOMAIN
   */
  domain?: string
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_AUTHENTIK_REDIRECT_URL or current URL
   */
  redirectURL?: string

  /**
   * Authentik Scope
   * @default ['openid', 'profile', 'email']
   */
  scope?: string[]
}

export function defineOAuthAuthentikEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthAuthentikConfig>) {
  return defineEventHandler(async (event: RequestEvent) => {
    config = defu(config, useRuntimeConfig().oauth?.authentik) as OAuthAuthentikConfig

    const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

    if (query.error) {
      const error = createError({
        status: 401,
        message: `Authentik login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret || !config.domain) {
      return handleMissingConfiguration(event, 'authentik', ['clientId', 'clientSecret', 'domain'], onError)
    }

    const authorizationURL = `https://${config.domain}/application/o/authorize/`
    const tokenURL = `https://${config.domain}/application/o/token/`
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    if (!query.code) {
      // Redirect to Authentik OAuth page

      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: (config.scope || ['openid', 'profile', 'email']).join(' '),
          state,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'authentik', onError)
    }

    const tokens = await requestAccessToken(tokenURL, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'authentik', tokens, onError)
    }

    const accessToken = tokens.access_token
    // Fetch user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(`https://${config.domain}/application/o/userinfo/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!user) {
      const error = createError({
        status: 500,
        message: 'Could not get Authentik user',
        data: tokens,
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
