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

export interface OAuthHubspotConfig {}
export interface OAuthHubspotUser {}

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

    console.log('tokens', tokens)

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'hubspot', tokens, onError)
    }

    const profile: OAuthHubspotUser = await $fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokens.access_token)

    return onSuccess(event, {
      user: {
        id: profile.user_id,
        email: profile.user,
        domain: profile.hub_domain,
      },
      tokens,
    })
  })
}
