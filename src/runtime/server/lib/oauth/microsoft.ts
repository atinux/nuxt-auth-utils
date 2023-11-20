import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
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
   * @default []
   * @see https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
   * @example ['User.Read']
   */
  scope?: string[]
  /**
   * Microsoft OAuth US Government
   * @see https://learn.microsoft.com/en-us/azure/azure-government/documentation-government-aad-auth-qs
   * @default false
   */
  usGov?: boolean
}

interface OAuthConfig {
  config?: OAuthMicrosoftConfig
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function microsoftEventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.microsoft) as OAuthMicrosoftConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.tenant) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_MICROSOFT_CLIENT_ID or NUXT_OAUTH_MICROSOFT_CLIENT_SECRET or NUXT_OAUTH_MICROSOFT_TENANT env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const authorizationURL = `https://login.microsoftonline.${config.usGov ? 'us' : 'com'}/${config.tenant}/oauth2/v2.0/authorize`
    const tokenURL = `https://login.microsoftonline.${config.usGov ? 'us' : 'com'}/${config.tenant}/oauth2/v2.0/token`

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      
      config.scope = config.scope || ['User.Read']
      // Redirect to Microsoft Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          response_type: 'code',
          redirect_uri: redirectUrl,
          scope: config.scope.join('%20'),
        })
      )
    }

    const data = new URLSearchParams()
    data.append('grant_type', 'authorization_code')
    data.append('client_id', config.clientId)
    data.append('client_secret', config.clientSecret)
    data.append('redirect_uri', parsePath(redirectUrl).pathname)
    data.append('code', String(code))

    const tokens: any = await ofetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:  data,
      }
    ).catch(error => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Microsoft login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const user: any = await ofetch(`https://graph.microsoft.${config.usGov ? 'us' : 'com'}/v1.0/me`, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`
      }
    }).catch(error => {
      return { error }
    })
    if (user.error) {
      console.log(user.error)
      const error = createError({
        statusCode: 401,
        message: `Microsoft login failed: ${user.error || 'Unknown error'}`,
        data: user
      })
      if (!onError) throw error
      return onError(event, error)
    }

    return onSuccess(event, {
      tokens,
      user
    })
  })
}
