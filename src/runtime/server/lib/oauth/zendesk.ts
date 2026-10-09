import type { RequestEvent } from 'nuxt/server'
import { defineEventHandler, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { $fetch } from 'ofetch'
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
   * Zendesk subdomain, for example `mycompany` for `mycompany.zendesk.com`
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
  /**
   * Zendesk Marketplace app ID header value.
   * Only required for apps published in the Zendesk Marketplace.
   * @default process.env.NUXT_OAUTH_ZENDESK_MARKETPLACE_APP_ID
   */
  marketplaceAppId?: string
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
  shared_phone_number: boolean | null
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
  refresh_token?: string
  token_type: string
  scope: string
  expires_in?: number
  refresh_token_expires_in?: number
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
  if (config.marketplaceAppId) {
    headers['X-Zendesk-Marketplace-App-Id'] = config.marketplaceAppId
  }
  return headers
}

export function defineOAuthZendeskEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthZendeskConfig, { user: ZendeskUser, tokens: ZendeskTokens }>) {
  return defineEventHandler(async (event: RequestEvent) => {
    const runtimeConfig = useRuntimeConfig().oauth?.zendesk
    config = defu(config, runtimeConfig) as OAuthZendeskConfig
    // Not a defu default: defu would append 'read' to a configured scope
    config.scope = config.scope?.length ? config.scope : ['read']
    // The user profile is always fetched, which needs `read` or `users:read`
    if (!config.scope.includes('read') && !config.scope.includes('users:read')) {
      config.scope.push('users:read')
    }

    if (!config.clientId || !config.clientSecret || !config.subdomain) {
      return handleMissingConfiguration(
        event,
        'zendesk',
        ['clientId', 'clientSecret', 'subdomain'],
        onError,
      )
    }

    const baseURL = `https://${config.subdomain}.zendesk.com`

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
      return sendRedirect(
        event,
        withQuery(`${baseURL}/oauth/authorizations/new`, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
        }),
      )
    }

    if (!state || query.state !== state) {
      return handleInvalidState(event, 'zendesk', onError)
    }

    const marketplaceHeaders = getMarketplaceHeaders(config)

    const tokens: ZendeskTokens & { error?: string, error_description?: string } = await requestAccessToken(`${baseURL}/oauth/tokens`, {
      headers: {
        // Zendesk documents JSON bodies for the token endpoint
        'Content-Type': 'application/json',
        ...marketplaceHeaders,
      },
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code as string,
        scope: config.scope.join(' '),
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'zendesk', tokens, onError)
    }

    const data: { user: ZendeskUser } = await $fetch(`${baseURL}/api/v2/users/me.json`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        ...marketplaceHeaders,
      },
    })

    return onSuccess(event, {
      user: data.user,
      tokens,
    })
  })
}
