import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
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
  redirectURL?: string,

  /**
   * Authentik Scope
   * @default []
   */
  scope?: string[]
}

export function defineOAuthAuthentikEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthAuthentikConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.authentik) as OAuthAuthentikConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
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

    if (!query.code) {
      // Redirect to Authentik OAuth page

      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: (config.scope || ['openid', 'profile', 'email']).join(' '),
        }),
      )
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
        statusCode: 500,
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
