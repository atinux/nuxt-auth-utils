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

export interface OAuthPlanningCenterConfig {
  /**
   * PlanningCenter OAuth Client ID
   * @default process.env.NUXT_OAUTH_PLANNING_CENTER_CLIENT_ID
   */
  clientId?: string

  /**
   * PlanningCenter OAuth Client Secret
   * @default process.env.NUXT_OAUTH_PLANNING_CENTER_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * PlanningCenter OAuth Redirect URL
   * @default process.env.NUXT_OAUTH_PLANNING_CENTER_REDIRECT_URL
   */
  redirectURL?: string

  /**
   * PlanningCenter OAuth Scope
   * @default ['people']
   * @see https://developer.planning.center/docs/#/overview/authentication#scopes
   * @example ['people', 'services', 'groups']
   */
  scope?: string[]
}

export function defineOAuthPlanningCenterEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthPlanningCenterConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(
      config,
      useRuntimeConfig(event).oauth?.planningcenter,
    ) as OAuthPlanningCenterConfig

    if (!config.clientId || !config.clientSecret || !config.redirectURL) {
      return handleMissingConfiguration(
        event,
        'planningcenter',
        ['clientId', 'clientSecret', 'redirectURL'],
        onError,
      )
    }

    const query = getQuery<{
      code?: string
      state?: string
      error?: string
      error_description?: string
    }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (query.error) {
      return handleAccessTokenErrorResponse(
        event,
        'planningcenter',
        query,
        onError,
      )
    }

    if (!query.code) {
      const scope = new Set(config.scope)

      // the people scope is required to access the authenticated user
      scope.add('people')

      return sendRedirect(
        event,
        withQuery('https://api.planningcenteronline.com/oauth/authorize', {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: [...scope].join(' '),
          response_type: 'code',
        }),
      )
    }

    const tokens = await requestAccessToken(
      'https://api.planningcenteronline.com/oauth/token',
      {
        body: {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: query.code as string,
          redirect_uri: redirectURL,
          grant_type: 'authorization_code',
        },
      },
    )

    if (tokens.error) {
      return handleAccessTokenErrorResponse(
        event,
        'planningcenter',
        tokens,
        onError,
      )
    }

    const userData = await $fetch<{
      data: {
        attributes: Record<string, unknown>
      }
    }>('https://api.planningcenteronline.com/people/v2/me', {
      headers: {
        Authorization: 'Bearer ' + tokens.access_token,
      },
    })

    return onSuccess(event, {
      user: userData.data.attributes,
      tokens,
    })
  })
}
