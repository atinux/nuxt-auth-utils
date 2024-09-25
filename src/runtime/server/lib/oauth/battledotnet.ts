import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthBattledotnetConfig {
  /**
   * Battle.net OAuth Client ID
   * @default process.env.NUXT_OAUTH_BATTLEDOTNET_CLIENT_ID
   */
  clientId?: string
  /**
   * Battle.net OAuth Client Secret
   * @default process.env.NUXT_OAUTH_BATTLEDOTNET_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Battle.net OAuth Scope
   * @default []
   * @see https://develop.battle.net/documentation/guides/using-oauth
   * @example ['openid', 'wow.profile', 'sc2.profile', 'd3.profile']
   */
  scope?: string[]
  /**
   * Battle.net OAuth Region
   * @default EU
   * @see https://develop.battle.net/documentation/guides/using-oauth
   * @example EU (possible values: US, EU, APAC)
   */
  region?: string
  /**
   * Battle.net OAuth Authorization URL
   * @default 'https://oauth.battle.net/authorize'
   */
  authorizationURL?: string
  /**
   * Battle.net OAuth Token URL
   * @default 'https://oauth.battle.net/token'
   */
  tokenURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://develop.battle.net/documentation/guides/using-oauth/authorization-code-flow
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_BATTLEDOTNET_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthBattledotnetEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBattledotnetConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.battledotnet, {
      authorizationURL: 'https://oauth.battle.net/authorize',
      tokenURL: 'https://oauth.battle.net/token',
      authorizationParams: {},
    }) as OAuthBattledotnetConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Battle.net login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'battledotnet', ['clientId', 'clientSecret'], onError,
      )
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || ['openid']
      config.region = config.region || 'EU'

      if (config.region === 'CN') {
        config.authorizationURL = 'https://oauth.battlenet.com.cn/authorize'
        config.tokenURL = 'https://oauth.battlenet.com.cn/token'
      }

      // Redirect to Battle.net Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state: randomUUID(), // Todo: handle PKCE flow
          response_type: 'code',
          ...config.authorizationParams,
        }),
      )
    }

    config.scope = config.scope || []
    if (!config.scope.includes('openid')) {
      config.scope.push('openid')
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      params: {
        grant_type: 'authorization_code',
        scope: config.scope.join(' '),
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'battle.net', tokens, onError)
    }

    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch('https://oauth.battle.net/userinfo', {
      headers: {
        'User-Agent': `Battledotnet-OAuth-${config.clientId}`,
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Battle.net user',
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
