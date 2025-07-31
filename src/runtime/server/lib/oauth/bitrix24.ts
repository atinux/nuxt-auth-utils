import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  requestAccessToken,
  handleState,
  handleInvalidState,
} from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface Bitrix24Tokens {
  accessToken: string
  clientEndpoint: string
  domain: string
  expiresIn: number
  memberId: string
  refreshToken: string
  scope: string
  serverEndpoint: string
  status: string
}

export interface Bitrix24UserProfile {
  id?: number
  isAdmin?: boolean
  /**
   * account address BX24 ( https://name.bitrix24.com )
   */
  targetOrigin?: string
  name?: {
    firstName?: string
    lastName?: string
  }
  gender?: string
  photo?: string
  timeZone?: string
  timeZoneOffset?: number
}

/**
 * Bitrix24
 * @memo Not send: `scope`, `redirect_uri`
 *
 * @see https://apidocs.bitrix24.com/api-reference/oauth/index.html
 */
export interface OAuthBitrix24Config {
  /**
   * Bitrix24 OAuth Client ID
   * @default process.env.NUXT_OAUTH_BITRIX24_CLIENT_ID
   */
  clientId?: string

  /**
   * Bitrix24 OAuth Client Secret
   * @default process.env.NUXT_OAUTH_BITRIX24_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Bitrix24 OAuth Authorization URL
   * @default '${baseURL}/oauth/authorize/'
   */
  authorizationURL?: string

  /**
   * Bitrix24 OAuth Token URL
   * @default 'https://oauth.bitrix.info/oauth/token/'
   */
  tokenURL?: string
}

export function defineOAuthBitrix24EventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthBitrix24Config, {
  user: Bitrix24UserProfile
  payload: Bitrix24Tokens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: any
}>) {
  return eventHandler(async (event: H3Event) => {
    if (event.method === 'HEAD') {
      event.node.res.end()
      return
    }

    const runtimeConfig = useRuntimeConfig(event).oauth?.bitrix24

    const query = getQuery<{
      authorizationServer?: string
      code?: string
      state?: string
    }>(event)

    const authorizationServer = query?.authorizationServer
    if (
      !query.code
      && typeof authorizationServer === 'undefined'
    ) {
      const error = createError({
        statusCode: 500,
        message: 'Query parameter `authorizationServer` empty or missing. Please provide a valid Bitrix24 authorizationServer.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    config = defu(config, runtimeConfig, {
      authorizationURL: `${authorizationServer}/oauth/authorize/`,
      tokenURL: `https://oauth.bitrix.info/oauth/token/`,
    }) as OAuthBitrix24Config

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'bitrix24', ['clientId', 'clientSecret'], onError)
    }

    const state = await handleState(event)

    if (!query.code) {
      // Redirect to Bitrix24 oAuth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          client_id: config.clientId,
          state,
        }),
      )
    }

    if (query?.state !== state) {
      handleInvalidState(event, 'bitrix24', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: '',
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'bitrix24', tokens, onError)
    }

    const payload: Bitrix24Tokens = {
      accessToken: tokens.access_token,
      clientEndpoint: tokens.client_endpoint,
      domain: tokens.domain,
      expiresIn: tokens.expires_in,
      memberId: tokens.member_id,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope,
      serverEndpoint: tokens.server_endpoint,
      status: tokens.status,
    }

    const response = await $fetch<{
      result: {
        ID: string
        NAME: string
        ADMIN: boolean
        LAST_NAME: string
        PERSONAL_GENDER: string
        PERSONAL_PHOTO: string
        TIME_ZONE: string
        TIME_ZONE_OFFSET: number
      }
      time: {
        start: number
        finish: number
        duration: number
        processing: number
        date_start: string
        date_finish: string
        operating: number
      }
    }>(`${payload.clientEndpoint}profile` as string, {
      params: {
        auth: payload.accessToken,
      },
    })

    const user = {
      id: Number.parseInt(response.result.ID),
      isAdmin: response.result.ADMIN,
      targetOrigin: `https://${tokens.client_endpoint.replaceAll('https://', '').replaceAll('http://', '').replace(/:(80|443)$/, '').replace('/rest/', '')}`,
      name: {
        firstName: response.result.NAME,
        lastName: response.result.LAST_NAME,
      },
      gender: response.result.PERSONAL_GENDER,
      photo: response.result.PERSONAL_PHOTO,
      timeZone: response.result.TIME_ZONE,
      timeZoneOffset: response.result.TIME_ZONE_OFFSET,
    }

    return onSuccess(event, {
      user,
      payload,
      tokens,
    })
  })
}
