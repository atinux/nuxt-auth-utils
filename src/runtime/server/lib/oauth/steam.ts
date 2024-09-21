import type { H3Event } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthSteamConfig {
  /**
   * Steam API Key
   * @default process.env.NUXT_OAUTH_STEAM_API_KEY
   * @see https://steamcommunity.com/dev
   */
  apiKey?: string

  /**
   * Steam Open ID OAuth Authorization URL
   * @default 'https://steamcommunity.com/openid/login'
   */
  authorizationURL?: string

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_STEAM_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthSteamEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthSteamConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.steam, {
      authorizationURL: 'https://steamcommunity.com/openid/login',
    }) as OAuthSteamConfig
    const query = getQuery<Record<string, string>>(event)

    if (!config.apiKey) {
      return handleMissingConfiguration(event, 'steam', ['apiKey'], onError)
    }

    if (!query['openid.claimed_id']) {
      const redirectURL = config.redirectURL || getRequestURL(event).href
      const steamOpenIdParams = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': redirectURL,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      }
      // Redirect to Steam Oauth page
      return sendRedirect(event, withQuery(config.authorizationURL as string, steamOpenIdParams))
    }

    const openIdCheck = {
      ns: 'http://specs.openid.net/auth/2.0',
      claimed_id: 'https://steamcommunity.com/openid/id/',
      identity: 'https://steamcommunity.com/openid/id/',
    }

    const idRegex = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
    const steamIdCheck = idRegex.exec(query['openid.claimed_id'])

    if (
      query['openid.op_endpoint'] !== config.authorizationURL
      || !steamIdCheck
      || query['openid.ns'] !== openIdCheck.ns
      || !query['openid.claimed_id']?.startsWith(openIdCheck.claimed_id)
      || !query['openid.identity']?.startsWith(openIdCheck.identity)
    ) {
      const error = createError({
        statusCode: 401,
        message: 'Steam login failed: Claimed identity is invalid.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const steamId = steamIdCheck[1]

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(withQuery('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
      key: config.apiKey,
      steamids: steamId,
    }))

    return onSuccess(event, {
      user: user.response.players[0],
      tokens: null,
    })
  })
}
