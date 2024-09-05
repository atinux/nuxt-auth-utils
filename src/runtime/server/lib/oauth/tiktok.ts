import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { sha256 } from 'ohash'
import { handleAccessTokenErrorResponse, handleMissingConfiguration, getOAuthRedirectURL, requestAccessToken, type RequestAccessTokenBody } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthTikTokConfig {
  /**
   * TikTok Client Key
   * @default process.env.NUXT_OAUTH_TIKTOK_CLIENT_KEY
   */
  clientKey?: string

  /**
   * TikTok OAuth Client Secret
   * @default process.env.NUXT_OAUTH_TIKTOK_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * TikTok OAuth Scope
   * @default []
   * @see https://developers.tiktok.com/doc/tiktok-api-scopes/
   * @example ['user.info.basic']
   */
  scope?: string[]

  /**
   * Use TikTok sandbox environment.
   * If true it will use Login Kit for Desktop, if false it will use Login Kit for Web.
   * This is because Login Kit for Web doesn't support localhost or IP addresses as redirect URIs.
   * @see https://developers.tiktok.com/doc/login-kit-web/
   * @see https://developers.tiktok.com/doc/login-kit-desktop/
   * @default import.meta.dev // true in development, false in production
   */
  sandbox?: boolean

  /**
   * TikTok OAuth Authorization URL
   * @default 'https://www.tiktok.com/v2/auth/authorize/'
   */
  authorizationURL?: string

  /**
   * TikTok OAuth Token URL
   * @default 'https://open.tiktokapis.com/v2/oauth/token/'
   */
  tokenURL?: string

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_TIKTOK_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthTikTokEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthTikTokConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.tiktok, {
      sandbox: import.meta.dev,
      authorizationURL: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenURL: 'https://open.tiktokapis.com/v2/oauth/token/',
    }) as OAuthTikTokConfig
    const query = getQuery<{ code?: string }>(event)
    if (!config.clientKey || !config.clientSecret) {
      return handleMissingConfiguration(event, 'tiktok', ['clientKey', 'clientSecret'], onError)
    }
    const codeVerifier = 'verify'
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    if (!query.code) {
      config.scope = config.scope || []
      if (!config.scope.includes('user.info.basic')) {
        config.scope.push('user.info.basic')
      }
      // Redirect to TikTok Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_key: config.clientKey,
          redirect_uri: redirectURL,
          scope: config.scope.join(','),
          ...config.sandbox
            ? {
                code_verifier: codeVerifier,
                code_challenge: sha256(codeVerifier),
                code_challenge_method: 'S256' }
            : {},
        }),
      )
    }

    interface TikTokRequestAccessTokenBody extends RequestAccessTokenBody {
      client_key: string
      code_verifier?: string
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        client_key: config.clientKey,
        client_secret: config.clientSecret,
        code: query.code,
        ...config.sandbox ? { code_verifier: codeVerifier } : {},
      } as TikTokRequestAccessTokenBody,
    },
    )

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'tiktok', tokens, onError)
    }
    const accessToken = tokens.access_token

    const userInfoFieldsByScope: Record<string, string[]> = {
      'user.info.basic': ['open_id', 'union_id', 'avatar_url', 'avatar_url_100', 'avatar_large_url', 'display_name'],
      'user.info.profile': ['bio_description', 'profile_deep_link', 'is_verified', 'username'],
      'user.info.stats': ['follower_count', 'following_count', 'likes_count', 'video_count'],
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userInfo: any = await $fetch(withQuery('https://open.tiktokapis.com/v2/user/info/', {
      fields: config.scope?.map(scope => userInfoFieldsByScope[scope]).flat().join(','),
    }), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const user = userInfo?.data?.user

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get TikTok user',
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
