import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import defu from 'defu'
import {
  getOAuthRedirectURL,
  handleAccessTokenErrorResponse,
  handleMissingConfiguration,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig } from '#imports'
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
  token: string
  user: string
  hub_domain: string
  scopes: string[]
  signed_access_token: SignedAccessToken
  hub_id: number
  app_id: number
  expires_in: number
  user_id: number
  token_type: string
}

export function defineOAuthHubspotEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthHubspotConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.hubspot) as OAuthHubspotConfig

    if (!config.clientId || !config.clientSecret || !config.redirectURL) {
      return handleMissingConfiguration(event, 'hubspot', ['clientId', 'clientSecret', 'redirectURL'], onError)
    }

    const query = getQuery<{ code?: string, state?: string, error?: string, error_description?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (query.error) {
      return handleAccessTokenErrorResponse(event, 'hubspot', query, onError)
    }

    if (!query.code) {
      return sendRedirect(
        event,
        withQuery('https://app.hubspot.com/oauth/authorize', {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope || 'oauth',
        }),
      )
    }

    const tokens = await requestAccessToken(
      'https://api.hubapi.com/oauth/v1/token', {
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

    const info: OAuthHubspotAccessInfo = await $fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokens.access_token)

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
