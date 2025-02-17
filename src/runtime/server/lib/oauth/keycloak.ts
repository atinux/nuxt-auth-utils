import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthKeycloakConfig {
  /**
   * Keycloak OAuth Client ID
   * @default process.env.NUXT_OAUTH_KEYCLOAK_CLIENT_ID
   */
  clientId?: string
  /**
   * Keycloak OAuth Client Secret
   * @default process.env.NUXT_OAUTH_KEYCLOAK_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Keycloak OAuth Server URL
   * @example http://192.168.1.10:8080
   * @default process.env.NUXT_OAUTH_KEYCLOAK_SERVER_URL
   */
  serverUrl?: string
  /**
   * Optional Keycloak OAuth Server URL to use internally, e.g. if Nuxt connects to a Docker hostname while the browser
   * redirect goes to localhost
   * @example http://keycloak:8080
   * @default process.env.NUXT_OAUTH_KEYCLOAK_SERVER_URL_INTERNAL
   */
  serverUrlInternal?: string
  /**
   * Keycloak OAuth Realm
   * @default process.env.NUXT_OAUTH_KEYCLOAK_REALM
   */
  realm?: string
  /**
   * Keycloak OAuth Scope
   * @default []
   * @see https://www.keycloak.org/docs/latest/authorization_services/
   * @example ['openid']
   */
  scope?: string[]
  /**
   * Extra authorization parameters to provide to the authorization URL
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_KEYCLOAK_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthKeycloakEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthKeycloakConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.keycloak, {
      authorizationParams: {},
    }) as OAuthKeycloakConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Keycloak login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (
      !config.clientId
      || !config.clientSecret
      || !config.serverUrl
      || !config.realm
    ) {
      return handleMissingConfiguration(event, 'keycloak', ['clientId', 'clientSecret', 'serverUrl', 'realm'], onError)
    }

    const realmURL = `${config.serverUrl}/realms/${config.realm}`
    const realmURLInternal = `${config.serverUrlInternal || config.serverUrl}/realms/${config.realm}`

    const authorizationURL = `${realmURL}/protocol/openid-connect/auth`
    const tokenURL = `${realmURLInternal}/protocol/openid-connect/token`
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || ['openid']

      // Redirect to Keycloak Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL, {
          ...query,
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          response_type: 'code',
          ...config.authorizationParams,
        }),
      )
    }

    config.scope = config.scope || []
    if (!config.scope.includes('openid')) {
      config.scope.push('openid')
    }

    const tokens = await requestAccessToken(tokenURL, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      } })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'keycloak', tokens, onError)
    }

    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(
      `${realmURL}/protocol/openid-connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    )

    if (!user) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Keycloak user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}