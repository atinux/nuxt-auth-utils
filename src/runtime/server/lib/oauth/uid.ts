import type { OAuthConfig } from '#auth-utils'
import type { H3Event } from 'h3'
import { createError, useRuntimeConfig } from '#imports'
import { defu } from 'defu'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { getOAuthRedirectURL, handleAccessTokenErrorResponse, handleMissingConfiguration, requestAccessToken } from '../utils'

export interface OAuthUidConfig {
  /**
   * U.id OAuth Client ID
   * @default process.env.NUXT_OAUTH_UID_CLIENT_ID
   */
  clientId?: string
  /**
   * U.id OAuth Client Secret
   * @default process.env.NUXT_OAUTH_UID_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * U.id OAuth Domain
   * @default process.env.NUXT_OAUTH_UID_DOMAIN
   */
  domain?: string
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_UID_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthUidEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthUidConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.uid, { domain: 'api-v2.u.id' }) as OAuthUidConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Uid login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError)
        throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'uid', ['clientId', 'clientSecret'], onError)
    }


    const authorizationURL = `https://u.id/oauth/authorize/`
    const tokenURL = `https://${config.domain}/api/oauth/token/`
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      // Redirect to Uid OAuth page

      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: ['openid', 'profile', 'email'].join(' '),
        }),
      )
    }

    const tokens = await requestAccessToken(tokenURL, {
      headers: {
        'Content-Type': 'application/json',
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
      return handleAccessTokenErrorResponse(event, 'uid', tokens, onError)
    }

    const accessToken = tokens.access_token
    // Fetch user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(`https://${config.domain}/api/v2/user_info/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Uid user',
        data: tokens,
      })
      if (!onError)
        throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
