import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { useRuntimeConfig } from '#imports'

export interface OAuthMicrosoftConfig {
  /**
   * Microsoft OAuth Client ID
   * @default process.env.NUXT_OAUTH_MICROSOFT_CLIENT_ID
   */
  clientId?: string
  /**
   * Microsoft  OAuth Client Secret
   * @default process.env.NUXT_OAUTH_MICROSOFT_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Microsoft OAuth Tenant ID
   * @default process.env.NUXT_OAUTH_MICROSOFT_TENANT
   */
  tenant?: string
  /**
   * Microsoft  OAuth Scope
   * @default ['User.Read']
   * @see https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
   */
  scope?: string[]
  /**
   * Microsoft OAuth Authorization URL
   * @default 'https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize'
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  authorizationURL?: string
  /**
   * Microsoft OAuth Token URL
   * @default 'https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token'
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  tokenURL?: string
  /**
   * Microsoft OAuth User URL
   * @default 'https://graph.microsoft.com/v1.0/me'
   * @see https://docs.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0&tabs=http
   */
  userURL?: string
  /**
   * Flag to call the "me" endpoint. May not be callable depending on scopes used.
   * If not used, Name and Email will be parsed from the returned JWT token.
   * @default false
   * @see https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
   */
  useUser?: boolean
  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  authorizationParams?: Record<string, string>
  /**
   * Redirect URL to prevent in prod prevent redirect_uri mismatch http to https
   * @default process.env.NUXT_OAUTH_MICROSOFT_REDIRECT_URL
   * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
   */
  redirectUrl?: string
}

interface OAuthConfig {
  config?: OAuthMicrosoftConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function microsoftEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.microsoft, {
      authorizationParams: {},
      useUser: false,
    }) as OAuthMicrosoftConfig

    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.tenant) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_MICROSOFT_CLIENT_ID or NUXT_OAUTH_MICROSOFT_CLIENT_SECRET or NUXT_OAUTH_MICROSOFT_TENANT env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const authorizationURL = config.authorizationURL || `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize`
    const tokenURL = config.tokenURL || `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`

    const redirectUrl = config.redirectUrl || getRequestURL(event).href
    if (!code) {
      const scope = config.scope && config.scope.length > 0 ? config.scope : ['User.Read']
      // Redirect to Microsoft Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectUrl,
          scope: scope.join(' '),
          ...config.authorizationParams,
        }),
      )
    }

    const data = new URLSearchParams()
    data.append('grant_type', 'authorization_code')
    data.append('client_id', config.clientId)
    data.append('client_secret', config.clientSecret)
    data.append('redirect_uri', parsePath(redirectUrl).pathname)
    data.append('code', String(code))

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await ofetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      },
    ).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Microsoft login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = {}

    if (config.useUser) {
      const userURL = config.userURL || 'https://graph.microsoft.com/v1.0/me'
      user = await ofetch(userURL, {
        headers: {
          Authorization: `${tokenType} ${accessToken}`,
        },
      }).catch((error) => {
        return { error }
      })
      if (user.error) {
        const error = createError({
          statusCode: 401,
          message: `Microsoft login failed: ${user.error || 'Unknown error'}`,
          data: user,
        })
        if (!onError) throw error
        return onError(event, error)
      }
    }
    else {
      // required to unsafely decode to get the Kid from the header
      const decoded = jwt.decode(accessToken, { complete: true })
      if (!decoded) {
        const error = createError({
          statusCode: 401,
          message: `Microsoft login failed: ${user.error || 'Failed to decoded JWT'}`,
        })
        if (!onError) throw error
        return onError(event, error)
      }

      const kid = decoded.header.kid
      if (!kid) {
        const error = createError({
          statusCode: 401,
          message: `Microsoft login failed: ${user.error || 'Missing Kid'}`,
        })
        if (!onError) throw error
        return onError(event, error)
      }

      const client = jwksClient({
        jwksUri: 'https://login.microsoftonline.com/common/discovery/keys',
      })

      // use kid to validate signature and get signingKey
      const key = await client.getSigningKey(kid)
      const signingKey = key.getPublicKey()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jwt.verify(accessToken, signingKey, function (err: any, decoded: any) {
        if (decoded) {
          const msJwtVersion: '1.0' | '2.0' = decoded.ver

          if (msJwtVersion === '2.0') {
            user.displayName = decoded.name
            user.mail = decoded.preferred_username
          }
          else {
            const firstName = decoded.given_name
            const lastName = decoded.family_name
            user.displayName = `${firstName} ${lastName}`
            user.mail = decoded.unique_name
          }
        }
        else {
          const error = createError({
            statusCode: 401,
            message: `Microsoft login failed: ${user.error || 'Token verification failed'}`,
            data: err,
          })
          if (!onError) throw error
          return onError(event, error)
        }
      })
    }

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
