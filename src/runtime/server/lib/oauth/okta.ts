import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleState, handleInvalidState, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthConfigExt<TConfig, TResult = {
  user: {
    user_profile?: { [key: string]: unknown }
    [key: string]: unknown
  }
  tokens: { [key: string]: unknown }
  openIdConfig: {
    end_session_endpoint?: string
    [key: string]: unknown
  }
}> extends OAuthConfig<TConfig, TResult> {
  config?: TConfig
  onSuccess: (event: H3Event, result: TResult) => Promise<void> | void
  onError?: (event: H3Event, error: unknown) => Promise<void> | void
}

export interface OAuthOktaConfig {
  /**
   * Okta OAuth Client ID
   * @default process.env.NUXT_OAUTH_OKTA_CLIENT_ID
   */
  clientId?: string
  /**
   * Okta OAuth Client Secret
   * @default process.env.NUXT_OAUTH_OKTA_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Okta OAuth Issuer
   * @default process.env.NUXT_OAUTH_OKTA_DOMAIN
   */
  domain?: string
  /**
   * Okta OAuth Authorization Server
   * @see https://developer.okta.com/docs/guides/customize-authz-server/main/#create-an-authorization-server
   * @default process.env.NUXT_OAUTH_OKTA_AUTHORIZATION_SERVER
   */
  authorizationServer?: string
  /**
   * Okta OAuth Audience
   * @default process.env.NUXT_OAUTH_OKTA_AUDIENCE
   */
  audience?: string
  /**
   * Okta OAuth Scope
   * @default []
   * @see https://okta.com/docs/get-started/apis/scopes/openid-connect-scopes
   * @example ['openid']
   */
  scope?: string | string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean
  /**
   * Maximum Authentication Age. If the elapsed time is greater than this value, the OP must attempt to actively re-authenticate the end-user.
   * @default 0
   * @see https://okta.com/docs/authenticate/login/max-age-reauthentication
   */
  maxAge?: number
  /**
   * Login connection. If no connection is specified, it will redirect to the standard Okta login page and show the Login Widget.
   * @default ''
   * @see https://okta.com/docs/api/authentication#social
   * @example 'github'
   */
  connection?: string
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://okta.com/docs/api/authentication#social
   * @example { display: 'popup' }
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_OKTA_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthOktaEventHandler({ config, onSuccess, onError }: OAuthConfigExt<OAuthOktaConfig>) {
  let return_to: string = ''
  interface OpenIdConfig {
    authorization_endpoint: string
    token_endpoint: string
    userinfo_endpoint: string
    [key: string]: unknown
  }

  function normalizeScope(scope: unknown, emailRequired?: boolean): string[] {
    let result: string[]
    if (!scope || (typeof scope === 'string' && scope.trim() === '')) {
      result = ['openid', 'email', 'profile']
    }
    else if (typeof scope === 'string') {
      result = scope.split(/[,| ]+/).filter(Boolean)
    }
    else if (Array.isArray(scope)) {
      result = scope
    }
    else {
      result = ['openid', 'email', 'profile']
    }
    result = [...new Set(result)]
    if (emailRequired && !result.includes('email')) {
      result.push('email')
    }
    return result
  }

  // Event handler for Okta OAuth. Is called multiple times during the OAuth flow.
  return eventHandler(async (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig(event)
    config = defu(config, runtimeConfig.oauth?.okta, {
      authorizationParams: {},
    }) as OAuthOktaConfig

    if (!config.clientId || !config.clientSecret || !config.domain || typeof config.domain !== 'string' || !config.domain.trim()) {
      return handleMissingConfiguration(event, 'okta', ['clientId', 'clientSecret', 'domain'], onError)
    }

    config.scope = normalizeScope(config.scope, config.emailRequired)

    const getOpenIdConfig = async (openIdConfigurationUrl: string, event?: H3Event): Promise<OpenIdConfig> => {
      let openIdConfig: OpenIdConfig | null = null
      try {
        openIdConfig = await $fetch<OpenIdConfig>(openIdConfigurationUrl)
      }
      catch (error) {
        if (config && config.domain) {
          const authz = config.authorizationServer
          openIdConfig = {
            authorization_endpoint: authz
              ? `https://${config.domain}/oauth2/${authz}/v1/authorize`
              : `https://${config.domain}/oauth2/v1/authorize`,
            token_endpoint: authz
              ? `https://${config.domain}/oauth2/${authz}/v1/token`
              : `https://${config.domain}/oauth2/v1/token`,
            userinfo_endpoint: authz
              ? `https://${config.domain}/oauth2/${authz}/v1/userinfo`
              : `https://${config.domain}/oauth2/v1/userinfo`,
            end_session_endpoint: undefined,
          }
        }
        else {
          // Log and throw a more actionable error if OpenID config fetch fails and no fallback is possible
          console.error('Failed to fetch Okta OpenID configuration. Please check your Okta domain and network connectivity:', error)
          const err = createError({
            statusCode: 500,
            message: 'Could not get Okta OpenID configuration. Please verify that your Okta domain is correct and reachable, and that the OpenID configuration endpoint is accessible.',
            data: error,
          })
          if (onError) await onError(event!, err)
          throw err
        }
      }
      return openIdConfig
    }

    const authServer = config.authorizationServer
    const openIdConfigurationUrl = authServer ? `https://${config.domain}/oauth2/${authServer}/.well-known/openid-configuration` : `https://${config.domain}/.well-known/openid-configuration`

    const openIdConfig = await getOpenIdConfig(openIdConfigurationUrl, event)
    const authorizationURL = openIdConfig.authorization_endpoint
    const tokenURL = openIdConfig.token_endpoint
    const userInfoUrl = openIdConfig.userinfo_endpoint

    const query = getQuery<{ code?: string, state?: string, return_to?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    const state = await handleState(event)

    if (query.return_to) {
      return_to = query.return_to
    }

    // Step 1: Authorization Request
    if (!query.code) {
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          audience: config.audience || '',
          max_age: config.maxAge || 0,
          connection: config.connection || '',
          state,
          ...config.authorizationParams,
        }),
      )
    }

    // Step 2: Validate callback state
    if (query.state !== state) {
      handleInvalidState(event, 'okta', onError)
    }

    // Step 3: Request Access Token
    const tokens = await requestAccessToken(tokenURL as string, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: {
        response_type: 'code',
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: config.scope?.join(' '),
        redirect_uri: redirectURL,
        code: query.code,
        state: query.state,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'okta', tokens, onError)
    }

    if (
      !tokens.access_token || typeof tokens.access_token !== 'string'
      || !tokens.token_type || typeof tokens.token_type !== 'string'
    ) {
      const err = createError({
        statusCode: 400,
        message: 'Invalid token response from Okta',
        data: tokens,
      })
      if (onError) return onError(event, err)
      throw err
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token

    // Step 4: Fetch user info from Okta using the access token
    let user: Record<string, unknown>
    try {
      user = await $fetch(userInfoUrl, {
        headers: {
          Authorization: `${tokenType} ${accessToken}`,
        },
      })
    }
    catch (error: unknown) {
      const err = createError({
        statusCode: 410,
        message: `Could not get Okta user info - ${error instanceof Error ? error.message : String(error)}`,
        data: tokens,
      })
      if (onError) return onError(event, err)
      throw err
    }

    user.return_to = return_to

    // Step 5: Call onSuccess handler with tokens, user, and OpenID config
    return onSuccess(event, {
      tokens,
      user,
      openIdConfig,
    })
  })
}
