import type { RequestEvent } from 'nuxt/server'
import { createError, defineEventHandler, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { withQuery } from 'ufo'
import defu from 'defu'
import {
  getOAuthRedirectURL,
  handleAccessTokenErrorResponse,
  handleMissingConfiguration,
  handleInvalidState,
  handleState,
  requestAccessToken,
} from '../utils'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthHubspotConfig {
  /**
   * Hubspot OAuth Client ID
   * @default process.env.NUXT_OAUTH_HUBSPOT_CLIENT_ID
   */
  clientId?: string

  /**
   * Hubspot OAuth Client Secret
   * @default process.env.NUXT_OAUTH_HUBSPOT_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Hubspot OAuth Redirect URL
   * @default process.env.NUXT_OAUTH_HUBSPOT_REDIRECT_URL
   */
  redirectURL?: string

  /**
   * Hubspot OAuth Scope
   * @default ['oauth']
   * @see https://developers.hubspot.com/beta-docs/guides/apps/authentication/scopes
   * @example ['accounting', 'automation', 'actions']
   */
  scope?: string[]
}
interface SignedAccessToken {
  expiresAt: number
  scopes: string
  hubId: number
  userId: number
  appId: number
  signature: string
  scopeToScopeGroupPks?: string
  newSignature?: string
  hublet?: string
  trialScopes?: string
  trialScopeToScopeGroupPks?: string
  isUserLevel: boolean
}

interface OAuthHubspotAccessInfo {
  active: boolean
  token: string
  client_id: string
  user: string
  hub_domain: string
  scopes: string[]
  signed_access_token: SignedAccessToken
  hub_id: number
  app_id: number
  expires_in: number
  user_id: number
  is_private_distribution?: boolean
  token_use: 'access_token'
  token_type: string
}

export function defineOAuthHubspotEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthHubspotConfig>) {
  return defineEventHandler(async (event: RequestEvent) => {
    config = defu(config, useRuntimeConfig().oauth?.hubspot) as OAuthHubspotConfig

    if (!config.clientId || !config.clientSecret || !config.redirectURL) {
      return handleMissingConfiguration(event, 'hubspot', ['clientId', 'clientSecret', 'redirectURL'], onError)
    }

    const query = getQuery<{ code?: string, state?: string, error?: string, error_description?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (query.error) {
      return handleAccessTokenErrorResponse(event, 'hubspot', query, onError)
    }

    const state = await handleState(event)

    if (!query.code) {
      return sendRedirect(
        event,
        withQuery('https://app.hubspot.com/oauth/authorize', {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope?.join(' ') || 'oauth',
          state,
        }),
      )
    }

    if (!state || query.state !== state) {
      return handleInvalidState(event, 'hubspot', onError)
    }

    const tokens = await requestAccessToken(
      'https://api.hubapi.com/oauth/2026-09/token', {
        body: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: query.code as string,
          redirect_uri: redirectURL,
          grant_type: 'authorization_code',
        },
      })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'hubspot', tokens, onError)
    }

    // The v1 `GET /oauth/v1/access-tokens/{token}` endpoint is deprecated in favor of token introspection.
    // @see https://developers.hubspot.com/docs/api-reference/legacy/authentication/oauth-tokens/v1/migration-guide
    const info = await requestAccessToken<OAuthHubspotAccessInfo & { error?: string }>(
      'https://api.hubapi.com/oauth/2026-09/token/introspect', {
        params: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          token: tokens.access_token,
          token_type_hint: 'access_token',
        },
      })

    if (info.error) {
      return handleAccessTokenErrorResponse(event, 'hubspot', info, onError)
    }

    // Introspection answers `{ active: false }` for an unknown token instead of failing
    if (!info.active) {
      const error = createError({
        status: 401,
        message: 'Hubspot login failed: the access token is not active',
        data: info,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      user: {
        id: info.user_id,
        email: info.user,
        domain: info.hub_domain,
      },
      tokens,
    })
  })
}
