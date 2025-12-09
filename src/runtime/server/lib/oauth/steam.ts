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

export function defineOAuthSteamEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthSteamConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.steam, {
      authorizationURL: 'https://steamcommunity.com/openid/login',
    }) as OAuthSteamConfig
    const query = getQuery<Record<string, string>>(event)

    if (!config.apiKey) {
      return handleMissingConfiguration(event, 'steam', ['apiKey'], onError)
    }

    const url = getRequestURL(event)
    if (!query['openid.claimed_id']) {
      const redirectURL = config.redirectURL || getRequestURL(event).href
      const realm = url.port ? `${url.protocol}//${url.hostname}:${url.port}` : `${url.protocol}//${url.hostname}`
      const steamOpenIdParams = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': redirectURL,
        'openid.realm': realm,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      }
      // Redirect to Steam Oauth page
      return sendRedirect(event, withQuery(config.authorizationURL as string, steamOpenIdParams))
    }

    if (!query['openid.signed']
      || !query['openid.sig']
    ) {
      const error = createError({
        statusCode: 400,
        message: 'Steam login failed: Incomplete query.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const openIdCheck: Record<string, string> = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'check_authentication',
      'openid.signed': query['openid.signed'],
      'openid.sig': query['openid.sig'],
    }

    for (const signed of query['openid.signed'].split(',')) {
      if (!query[`openid.${signed}`]) {
        const error = createError({
          statusCode: 400,
          message: 'Steam login failed: Incomplete query.',
        })
        if (!onError) throw error
        return onError(event, error)
      }
      openIdCheck[`openid.${signed}`] = query[`openid.${signed}`] as string
    }

    const auth_validation: string = await $fetch(withQuery(config?.authorizationURL as string, openIdCheck))

    const validRegex = /is_valid:true/
    const valid = validRegex.test(auth_validation)

    if (!valid) {
      const error = createError({
        statusCode: 401,
        message: 'Steam login failed: Claimed identity is invalid.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const idRegex = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/
    const steamIdCheck = idRegex.exec(query['openid.claimed_id'])

    const steamId = steamIdCheck?.[1]

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
