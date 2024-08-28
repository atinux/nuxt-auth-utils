import { randomUUID } from 'node:crypto'
import type { H3Event, EventHandler } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig, OAuthToken, OAuthUser, OAuthAccessTokenSuccess, OAuthAccessTokenError } from '#auth-utils'

/**
 * Battle.net User
 *
 * Unable to find documentation on the user object
 */
type BattledotnetUser = {
  sub: string
  id: number
  battletag: string
}

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

export function oauthBattledotnetEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBattledotnetConfig, BattledotnetUser>): EventHandler {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.battledotnet, {
      authorizationURL: 'https://oauth.battle.net/authorize',
      tokenURL: 'https://oauth.battle.net/token',
      authorizationParams: {},
    }) as OAuthBattledotnetConfig

    const query = getQuery(event)
    const { code } = query

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
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_BATTLEDOTNET_CLIENT_ID or NUXT_OAUTH_BATTLEDOTNET_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
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

    const authCode = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

    const tokens = await $fetch<unknown>(
      config.tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authCode}`,
        },
        params: {
          code,
          grant_type: 'authorization_code',
          scope: config.scope.join(' '),
          redirect_uri: parsePath(redirectURL).pathname,
        },
      },
    ).catch((error) => {
      return { error }
    })

    if ((tokens as OAuthAccessTokenError).error) {
      const error = createError({
        statusCode: 401,
        message: `Battle.net login failed: ${(tokens as OAuthAccessTokenError).error || 'Unknown error'}`,
        data: tokens as OAuthAccessTokenError,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = (tokens as OAuthAccessTokenSuccess).access_token

    const user = await $fetch<BattledotnetUser>('https://oauth.battle.net/userinfo', {
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
      user: normalizeBattledotnetUser(user),
      tokens: normalizeBattledotnetToken(tokens as OAuthAccessTokenSuccess),
    })
  })
}

function normalizeBattledotnetUser(user: BattledotnetUser): OAuthUser<BattledotnetUser> {
  return {
    id: user.id,
    raw: user,
  }
}

function normalizeBattledotnetToken(tokens: OAuthAccessTokenSuccess): OAuthToken {
  return {
    token: tokens.access_token,
    expiresIn: tokens.expires_in,
    approvedScopes: tokens.scope?.split(','),
  }
}
