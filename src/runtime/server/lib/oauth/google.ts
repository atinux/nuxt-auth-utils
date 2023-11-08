import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'

export interface OAuthGoogleConfig {
  /**
   * Google OAuth Client ID
   * @default process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID
   */
  clientId?: string

   /**
   * Google OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
   */
   clientSecret?: string

  /**
   * Google OAuth Scope
   * @default []
   * @see https://developers.google.com/identity/protocols/oauth2/scopes#google-sign-in
   * @example ['email', 'profile']
   */
  scope?: string[]

  /**
   * Google OAuth Authorization URL
   * @default 'https://accounts.google.com/o/oauth2/v2/auth'
   */
  authorizationURL?: string

  /**
   * Google OAuth Token URL
   * @default 'https://oauth2.googleapis.com/token'
   */
  tokenURL?: string
}

interface OAuthConfig {
  config?: OAuthGoogleConfig
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function spotifyEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.spotify, {
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token'
    }) as OAuthGoogleConfig
    const { code } = getQuery(event)

    if (!config.clientId) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_GOOGLE_CLIENT_ID env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || ['userinfo.email', 'userinfo.profile']
      // Redirect to Google Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join('%20')
        })
      )
    }

    const tokens: any = await ofetch(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${code}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        params: {
          grant_type: 'authorization_code',
          redirect_uri: parsePath(redirectUrl).pathname,
          code
        }
      }
    ).catch(error => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Google login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    const user: any = await ofetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    return onSuccess(event, {
      tokens,
      user
    })
  })
}
