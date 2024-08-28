import type { H3Event } from 'h3'
import { eventHandler, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { handleAccessTokenErrorResponse, handleMissingConfiguration } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthXSUAAConfig {
  /**
   * XSUAA OAuth Client ID
   * @default process.env.NUXT_OAUTH_XSUAA_CLIENT_ID
   */
  clientId?: string
  /**
   * XSUAA OAuth Client Secret
   * @default process.env.NUXT_OAUTH_XSUAA_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * XSUAA OAuth Issuer
   * @default process.env.NUXT_OAUTH_XSUAA_DOMAIN
   */
  domain?: string
  /**
   * XSUAA OAuth Scope
   * @default []
   * @see https://sap.github.io/cloud-sdk/docs/java/guides/cloud-foundry-xsuaa-service
   * @example ['openid']
   */
  scope?: string[]
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_XSUAA_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function oauthXSUAAEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthXSUAAConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.xsuaa) as OAuthXSUAAConfig
    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.domain) {
      return handleMissingConfiguration(event, 'xsuaa', ['clientId', 'clientSecret', 'domain'], onError)
    }
    const authorizationURL = `https://${config.domain}/oauth/authorize`
    const tokenURL = `https://${config.domain}/oauth/token`

    const redirectURL = config.redirectURL || getRequestURL(event).href
    if (!code) {
      config.scope = config.scope || []
      // Redirect to XSUAA Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
        }),
      )
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: parsePath(redirectURL).pathname,
          code: `${code}`,
        }),
      },
    ).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'auth0', tokens, onError)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(`https://${config.domain}/userinfo`, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
