import crypto from 'node:crypto'
import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  requestAccessToken,
  type RequestAccessTokenBody,
} from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthVKConfig {
  /**
   * VK OAuth Client ID
   * @default process.env.NUXT_OAUTH_VK_CLIENT_ID
   */
  clientId?: string

  /**
   * VK OAuth Client Secret
   * @default process.env.NUXT_OAUTH_VK_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * VK OAuth Scope
   * @default []
   * @see https://id.vk.com/about/business/go/docs/en/vkid/latest/vk-id/connection/api-integration/api-description#App-access-to-user-data
   * @example ["email", "phone"]
   */
  scope?: string[]

  /**
   * Require email from user, adds the ['login:email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * VK OAuth Authorization URL
   * @default 'https://id.vk.com/authorize'
   */
  authorizationURL?: string

  /**
   * VK OAuth Token URL
   * @default 'https://id.vk.com/oauth2/auth'
   */
  tokenURL?: string

  /**
   * VK OAuth User URL
   * @default 'https://id.vk.com/oauth2/user_info'
   */
  userURL?: string

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_VK_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthVKEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthVKConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.vk, {
      authorizationURL: 'https://id.vk.com/authorize',
      tokenURL: 'https://id.vk.com/oauth2/auth',
      userURL: 'https://id.vk.com/oauth2/user_info',
    }) as OAuthVKConfig

    const query = getQuery<{ code?: string, device_id?: string }>(event)

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'vk',
        ['clientId', 'clientSecret'],
        onError,
      )
    }

    const codeVerifier = 'verify'
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }

      // Redirect to VK Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          code_challenge: crypto.createHash('sha256').update(codeVerifier).digest('base64url'),
          code_challenge_method: 's256',
          state: crypto.randomUUID(),
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
        }),
      )
    }

    interface VKRequestAccessTokenBody extends RequestAccessTokenBody {
      code_verifier?: string
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        code: query.code as string,
        code_verifier: codeVerifier,
        client_id: config.clientId,
        device_id: query.device_id,
        redirect_uri: redirectURL,
      } as VKRequestAccessTokenBody,
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'vk', tokens, onError)
    }

    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(config.userURL as string, {
      method: 'POST',
      body: {
        access_token: accessToken,
        client_id: config.clientId,
      },
    })

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get VK user',
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
