import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { defu } from 'defu'
import { withQuery } from 'ufo'
import { randomUUID } from 'uncrypto'
import {
  getOAuthRedirectURL,
  handleAccessTokenErrorResponse,
  handleMissingConfiguration,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface LiveChatTokens {
  access_token: string
  account_id: string
  expires_in: number
  organization_id: string
  refresh_token: string
  scope: string
  token_type: string
}

export interface LiveChatUser {
  account_id: string
  name: string
  email: string
  email_verified: boolean
  default_product: string | null
  default_organization_id: string | null
  avatar_url: string | null
  time_zone: string
  roles?: {
    role_id: string
    product: string
    role: string
    type: string
    predefined: boolean
  }[]
  updated_at: string
  created_at: string
  properties?: Record<string, unknown>
}

export interface LiveChatConfig {
  /**
   * LiveChat OAuth Client ID
   * @default process.env.NUXT_LIVECHAT_CLIENT_ID
   */
  clientId?: string

  /**
   * LiveChat OAuth Client Secret
   * @default process.env.NUXT_LIVECHAT_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_LIVECHAT_REDIRECT_URL or current URL
   */
  redirectURL?: string

  /**
   * LiveChat OAuth Authorization URL
   * @default 'https://accounts.livechat.com
   */
  authorizationURL?: string

  /**
   * LiveChat OAuth Token URL
   * @default 'https://accounts.livechat.com/v2/token
   */
  tokenURL?: string

  /**
   * LiveChat User URL
   * @default 'https://accounts.livechat.com/v2/accounts/me
   */
  userURL?: string

  /**
   * LiveChat OAuth Scope. accounts--my:ro is always applied to get user profile.
   * @default ['accounts--my:ro']
   * @example ['accounts--my:ro', 'chats--my:ro']
   */
  scope?: string[]

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://platform.text.com/docs/authorization/authorization-in-practice
   */
  authorizationParams?: Record<string, string>
}

export function defineOAuthLiveChatEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<LiveChatConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.livechat, {
      authorizationURL: 'https://accounts.livechat.com',
      tokenURL: 'https://accounts.livechat.com/v2/token',
      userURL: 'https://accounts.livechat.com/v2/accounts/me',
      scope: [],
      authorizationParams: {
        state: randomUUID(),
      },
    }) as LiveChatConfig

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'livechat',
        ['clientId', 'clientSecret'],
        onError,
      )
    }

    const query = getQuery<{ code?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    // Ensure accounts--my:ro is always applied.
    const scope = [...new Set([...config.scope!, 'accounts--my:ro'])].join(' ')

    if (!query.code) {
      return sendRedirect(
        event,
        withQuery(config.authorizationURL!, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          response_type: 'code',
          scope,
          ...config.authorizationParams,
        }),
      )
    }

    const tokens = await requestAccessToken(config.tokenURL!, {
      params: {
        grant_type: 'authorization_code',
        code: query.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
      },
    }).catch((error) => {
      return { error }
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'livechat', tokens, onError)
    }

    const user = await $fetch<LiveChatUser>(config.userURL!, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
