import type { H3Event } from 'h3'
import { createError, eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  handleInvalidState,
  handleState,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthZendeskConfig {
  /**
   * Zendesk OAuth Client ID
   * @default process.env.NUXT_OAUTH_ZENDESK_CLIENT_ID
   */
  clientId?: string
  /**
   * Zendesk OAuth Client Secret
   * @default process.env.NUXT_OAUTH_ZENDESK_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Zendesk subdomain. If provided, uses the standard OAuth flow.
   * If omitted, uses the OAuth bridge flow (https://oauth-bridge.zendesk.com).
   * @default process.env.NUXT_OAUTH_ZENDESK_SUBDOMAIN
   */
  subdomain?: string
  /**
   * Zendesk OAuth Scope
   * @default ['read']
   * @see https://support.zendesk.com/hc/en-us/articles/4408845965210-Using-OAuth-authentication-with-your-application
   * @example ['read', 'write']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['users:read'] scope if not present
   * @default false
   */
  emailRequired?: boolean
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_ZENDESK_REDIRECT_URL
   */
  redirectURL?: string
  /**
   * Zendesk Marketplace name header value.
   * Only required for apps published in the Zendesk Marketplace.
   * @default process.env.NUXT_OAUTH_ZENDESK_MARKETPLACE_NAME
   */
  marketplaceName?: string
  /**
   * Zendesk Marketplace organization ID header value.
   * Only required for apps published in the Zendesk Marketplace.
   * @default process.env.NUXT_OAUTH_ZENDESK_MARKETPLACE_ORG_ID
   */
  marketplaceOrgId?: string
  /**
   * Zendesk Marketplace bot ID header value.
   * Only required for marketplace bot integrations.
   * @default process.env.NUXT_OAUTH_ZENDESK_MARKETPLACE_BOT_ID
   */
  marketplaceBotId?: string
}

export interface ZendeskUser {
  id: number
  url: string
  name: string
  email: string
  created_at: string
  updated_at: string
  time_zone: string | null
  iana_time_zone: string | null
  phone: string | null
  shared_phone_number: string | null
  photo: {
    url: string | null
    content_url: string | null
  } | null
  locale_id: number
  locale: string
  organization_id: number | null
  role: string
  verified: boolean
  external_id: string | null
  tags: string[]
  alias: string | null
  active: boolean
  shared: boolean
  shared_agent: boolean
  last_login_at: string | null
  two_factor_auth_enabled: boolean
  signature: string | null
  details: string | null
  notes: string | null
  role_type: number | null
  custom_role_id: number | null
  is_billing_admin: boolean
  moderator: boolean
  ticket_restriction: string | null
  only_private_comments: boolean
  restricted_agent: boolean
  suspended: boolean
  default_group_id: number | null
  report_csv: boolean
  user_fields: Record<string, unknown>
  suspension_details: unknown | null
}

export interface ZendeskTokens {
  access_token: string
  refresh_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token_expires_in: number
}

interface ZendeskTokenInfo {
  app: {
    id: string
    subdomain: string
  }
}

function getMarketplaceHeaders(config: OAuthZendeskConfig): Record<string, string> {
  const headers: Record<string, string> = {}
  if (config.marketplaceName) {
    headers['X-Zendesk-Marketplace-Name'] = config.marketplaceName
  }
  if (config.marketplaceOrgId) {
    headers['X-Zendesk-Marketplace-Organization-Id'] = config.marketplaceOrgId
  }
  if (config.marketplaceBotId) {
    headers['X-Zendesk-Marketplace-Bot-Id'] = config.marketplaceBotId
  }
  return headers
}

export function defineOAuthZendeskEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthZendeskConfig, { user: ZendeskUser, tokens: ZendeskTokens }>) {
  return eventHandler(async (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig(event).oauth?.zendesk
    config = defu(config, runtimeConfig, {
      scope: ['read'],
    }) as OAuthZendeskConfig

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'zendesk',
        ['clientId', 'clientSecret'],
        onError,
      )
    }

    const isBridge = !config.subdomain
    const bridgeBaseURL = 'https://oauth-bridge.zendesk.com'
    const authorizationURL = isBridge
      ? `${bridgeBaseURL}/sc/oauth/authorize`
      : `https://${config.subdomain}.zendesk.com/oauth/authorizations/new`
    const tokenURL = isBridge
      ? `${bridgeBaseURL}/sc/oauth/token`
      : `https://${config.subdomain}.zendesk.com/oauth/tokens`

    const query = getQuery<{ code?: string, error?: string, error_description?: string, state?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (query.error) {
      return handleAccessTokenErrorResponse(
        event,
        'zendesk',
        {
          error: query.error,
          error_description: query.error_description,
        },
        onError,
      )
    }

    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || ['read']
      if (config.emailRequired && !config.scope.includes('users:read')) {
        config.scope.push('users:read')
      }

      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
        }),
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'zendesk', onError)
    }

    const marketplaceHeaders = getMarketplaceHeaders(config)

    const tokens: ZendeskTokens = await requestAccessToken(tokenURL, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...marketplaceHeaders,
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code as string,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'zendesk', tokens, onError)
    }

    let subdomain = config.subdomain as string

    if (isBridge) {
      const tokenInfo: ZendeskTokenInfo = await $fetch(`${bridgeBaseURL}/sc/v2/tokenInfo`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          ...marketplaceHeaders,
        },
      })

      if (!tokenInfo.app?.subdomain) {
        const error = createError({
          statusCode: 500,
          message: 'Zendesk login failed: could not determine subdomain from token info',
        })
        if (!onError) throw error
        return onError(event, error)
      }

      subdomain = tokenInfo.app.subdomain
    }

    const data: { user: ZendeskUser } = await $fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    return onSuccess(event, {
      user: data.user,
      tokens,
    })
  })
}
