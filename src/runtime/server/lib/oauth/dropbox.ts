import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthDropboxConfig {
  /**
   * Dropbox Client ID
   * @default process.env.NUXT_OAUTH_DROPBOX_CLIENT_ID
   */
  clientId?: string

  /**
   * Dropbox OAuth Client Secret
   * @default process.env.NUXT_OAUTH_DROPBOX_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Dropbox OAuth Scope
   * @default []
   * @see https://developers.dropbox.com/oauth-guide#dropbox-api-permissions
   * @example ['email', 'profile']
   */
  scope?: string[]

  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * Dropbox OAuth Authorization URL
   * @default 'https://www.dropbox.com/oauth2/authorize'
   */
  authorizationURL?: string

  /**
   * Dropbox OAuth Token URL
   * @default 'https://api.dropboxapi.com/oauth2/token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://www.dropbox.com/developers/documentation/http/documentation#authorization
   * @example { locale: 'en-US' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_DROPBOX_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthDropboxEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthDropboxConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.dropbox, {
      authorizationURL: 'https://www.dropbox.com/oauth2/authorize',
      tokenURL: 'https://api.dropboxapi.com/oauth2/token',
      authorizationParams: {},
    }) as OAuthDropboxConfig

    const query = getQuery<{ code?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'dropbox', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    if (!query.code) {
      config.scope = config.scope || []
      if (!config.scope.includes('openid')) {
        config.scope.push('openid')
      }
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }

      // Redirect to Dropbox Oauth page
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

    const tokens = await requestAccessToken(config.tokenURL as string, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      params: {
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'dropbox', tokens, onError)
    }

    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: any = await $fetch('https://api.dropboxapi.com/2/openid/userinfo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const user = users

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Dropbox user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
