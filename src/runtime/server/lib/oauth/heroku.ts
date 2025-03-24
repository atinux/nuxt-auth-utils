import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken, handleState, handleInvalidState } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthHerokuConfig {
  /**
   * Heroku OAuth Client ID
   * @default process.env.NUXT_OAUTH_HEROKU_CLIENT_ID
   */
  clientId?: string
  /**
   * Heroku OAuth Client Secret
   * @default process.env.NUXT_OAUTH_HEROKU_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Heroku OAuth Scope
   * @default ['identity']
   * @see https://devcenter.heroku.com/articles/oauth#scopes
   * @example ['identity']
   */
  scope?: string[]
  /**
   * Heroku OAuth Authorization URL
   * @default 'https://id.heroku.com/oauth/authorize'
   */
  authorizationURL?: string
  /**
   * Heroku OAuth Authorization URL
   * @default 'https://id.heroku.com/oauth/token'
   */
  tokenURL?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @default {}
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_HEROKU_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthHerokuEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthHerokuConfig>) {
  return eventHandler(async (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig(event).oauth?.heroku
    const baseURL = 'https://id.heroku.com'
    config = defu(config, runtimeConfig, {
      authorizationURL: `${baseURL}/oauth/authorize`,
      tokenURL: `${baseURL}/oauth/token`,
      authorizationParams: {},
    }) as OAuthHerokuConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `Heroku login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'heroku', ['clientId', 'clientSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || ['identity']
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state,
          ...config.authorizationParams,
        }),
      )
    }

    if (query.state !== state) {
      handleInvalidState(event, 'heroku', onError)
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'heroku', tokens, onError)
    }

    const accessToken = tokens.access_token
    const user = await $fetch(`https://api.heroku.com/account`, {
      headers: {
        Accept: 'application/vnd.heroku+json; version=3',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
