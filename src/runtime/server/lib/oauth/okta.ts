import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { handleMissingConfiguration, handleAccessTokenErrorResponse, getOAuthRedirectURL, requestAccessToken } from '../utils'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

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
   * Okta OAuth Client Secret
   * @default process.env.NUXT_OAUTH_OKTA_DOMAIN
   */
  domain?: string
  /**
   * Okta OAuth Scope
   * @default []
   * @see https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/#scopes-and-supported-endpoints
   * @example ['okta.myAccount.email.read']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['okta.myAccount.email.read'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_OKTA_REDIRECT_URL
   */
  redirectURL?: string
}

export function defineOAuthOktaEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthOktaConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.okta, {
      authorizationParams: {},
    }) as OAuthOktaConfig

    if (!config.clientId || !config.clientSecret || !config.domain) {
      return handleMissingConfiguration(event, 'okta', ['clientId', 'clientSecret', 'domain'], onError)
    }
    const authorizationURL = `https://${config.domain}.okta.com/oauth2/v1/authorize`
    const tokenURL = `https://${config.domain}.okta.com/oauth2/v1/token`

    const query = getQuery<{ code?: string }>(event)
    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (config.emailRequired && !config.scope.includes('okta.myAccount.email.read')) {
        config.scope.push('okta.myAccount.email.read')
      }

      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          client_id: config.clientId,
          redirect_uri: redirectURL,
          response_type: 'code',
          scope: config.scope.join(' '),
          state: 'foo',
        }),
      )
    }

    const tokens = await requestAccessToken(tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'okta', tokens, onError)
    }

    const accessToken = tokens.access_token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emails: any[] = await $fetch(`https://${config.domain}.okta.com/idp/myaccount/emails`, {
      headers: {
        Accept: 'application/json; okta-version=1.0.0',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = {
      email: emails[0]?.profile?.email,
    }

    return onSuccess(event, {
      user,
      tokens,
    })
  })
}
