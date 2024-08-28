import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  eventHandler,
  createError,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthXConfig {
  /**
   * X OAuth Client ID
   * @default process.env.NUXT_OAUTH_X_CLIENT_ID
   */
  clientId?: string
  /**
   * X OAuth Client Secret
   * @default process.env.NUXT_OAUTH_X_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * X OAuth Scope
   * @default []
   * @see https://developer.x.com/en/docs/authentication/oauth-2-0/user-access-token
   * @example ['tweet.read', 'users.read', 'offline.access'],
   */
  scope?: string[]

  /**
   * X OAuth Authorization URL
   * @default 'https://twitter.com/i/oauth2/authorize'
   */
  authorizationURL?: string

  /**
   * X OAuth Token URL
   * @default 'https://api.twitter.com/2/oauth2/token'
   */
  tokenURL?: string

  /**
   * X OAuth User URL
   * @default 'https://api.twitter.com/2/users/me'
   */
  userURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developer.x.com/en/docs/authentication/oauth-2-0/user-access-token
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_X_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthXEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthXConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.x, {
      authorizationURL: 'https://x.com/i/oauth2/authorize',
      tokenURL: 'https://api.x.com/2/oauth2/token',
      userURL: 'https://api.x.com/2/users/me',
      authorizationParams: {
        state: randomUUID(),
        code_challenge: randomUUID(),
      },
    }) as OAuthXConfig
    const { code } = getQuery(event)

    if (!config.clientId) {
      return handleMissingConfiguration(event, 'x', ['clientId'], onError)
    }

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || ['tweet.read', 'users.read', 'offline.access']
      // Redirect to X Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          code_challenge_method: 'plain',
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      grant_type: 'authorization_code',
      code_verifier: config.authorizationParams.code_challenge,
      redirect_uri: parsePath(redirectURL).pathname,
      code,
    }

    const authCode = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(config.tokenURL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authCode}`,
      },
      params,
    }).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `X login failed: ${
          tokens.error?.data?.error_description || 'Unknown error'
        }`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(
      config.userURL as string,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        query: {
          'user.fields': 'description,id,name,profile_image_url,username,verified,verified_type',
        },
      },
    ).catch((error) => {
      return error
    })

    if (config.emailRequired) {
      // Fetch email if required
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailData: any = await $fetch('https://api.twitter.com/1.1/account/verify_credentials.json', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        query: {
          include_email: 'true',
          skip_status: 'true',
        },
      }).catch((error) => {
        return error
      })

      if (emailData && emailData.email) {
        user.email = emailData.email
      }
      else {
        const error = createError({
          statusCode: 401,
          message: 'Twitter login failed: no user email found',
        })
        if (!onError) throw error
        return onError(event, error)
      }
    }

    return onSuccess(event, {
      tokens,
      user: user?.data,
    })
  })
}
