import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  requestAccessToken,
} from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthGiteaConfig {
  /**
   * Gitea OAuth Client ID
   * @default process.env.NUXT_OAUTH_GITEA_CLIENT_ID
   */
  clientId?: string
  /**
   * Gitea OAuth Client Secret
   * @default process.env.NUXT_OAUTH_GITEA_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Gitea OAuth Scope
   * @default ['read:user']
   * @see https://docs.gitea.io/en-us/oauth2-provider/
   * @example ['read:user']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * Gitea OAuth Authorization URL
   * @default '/login/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * Gitea OAuth Token URL
   * @default '/login/oauth/access_token'
   */
  tokenURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.gitea.io/en-us/oauth2-provider/
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_GITEA_REDIRECT_URL
   */
  redirectURL?: string

  /**
   * URL of your Gitea instance
   * @default 'http://localhost:3000'
   */
  baseURL?: string
}

export function defineOAuthGiteaEventHandler({
  config,
  onSuccess,
  onError
}: OAuthConfig<OAuthGiteaConfig>) {
  return eventHandler(async (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig(event).oauth?.gitea
    const baseURL = config?.baseURL ?? runtimeConfig.baseURL ?? 'http://localhost:3000'
    config = defu(config, runtimeConfig, {
      authorizationURL: `${baseURL}/login/oauth/authorize`,
      tokenURL: `${baseURL}/login/oauth/access_token`,
      authorizationParams: {}
    }) as OAuthGiteaConfig

    const query = getQuery<{ code?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Gitea login failed: ${query.error || 'Unknown error'}`,
        data: query
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(
        event,
        'gitea',
        ['clientId', 'clientSecret'],
        onError
      )
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (!config.scope.length) {
        config.scope.push('read:user')
      }
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          ...config.authorizationParams
        })
      )
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code
      }
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'gitea', tokens, onError)
    }

    const accessToken = tokens.access_token

    const user: any = await $fetch(`${baseURL}/api/v1/user`, {
      headers: {
        Authorization: `token ${accessToken}`
      }
    })

    return onSuccess(event, {
      user,
      tokens
    })
  })
}
