import type { H3Event, H3Error } from 'h3'
import { eventHandler, createError, getQuery, getRequestURL, sendRedirect } from 'h3'
import { withQuery, parsePath } from 'ufo'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import crypto from 'crypto'

export interface OAuthAuth0Config {
  /**
   * Auth0 OAuth Client ID
   * @default process.env.NUXT_OAUTH_AUTH0_CLIENT_ID
   */
  clientId?: string
  /**
   * Auth0 OAuth Client Secret
   * @default process.env.NUXT_OAUTH_AUTH0_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Auth0 OAuth Issuer
   * @default process.env.NUXT_OAUTH_AUTH0_DOMAIN
   */
  domain?: string
  /**
   * Auth0 OAuth Audience
   * @default ''
   */
  audience?: string
  /**
   * Auth0 OAuth Scope
   * @default []
   * @see https://auth0.com/docs/get-started/apis/scopes/openid-connect-scopes
   * @example ['openid']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['email'] scope if not present
   * @default false
   */
  emailRequired?: boolean
  /**
   * checks
   * @default []
   * @see https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce
   * @see https://auth0.com/docs/protocols/oauth2/oauth-state
   */
  checks?: OAuthChecks[]
}

type OAuthChecks = 'pkce' | 'state'
interface OAuthConfig {
  config?: OAuthAuth0Config
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

function base64URLEncode(str: string) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function randomBytes(length: number) {
  return crypto.randomBytes(length).toString('base64')
}
function sha256(buffer: string) {
  return crypto.createHash('sha256').update(buffer).digest('base64')
}

export function auth0EventHandler({ config, onSuccess, onError }: OAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).oauth?.auth0) as OAuthAuth0Config
    const { code, state } = getQuery(event)

    if (!config.clientId || !config.clientSecret || !config.domain) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_OAUTH_AUTH0_CLIENT_ID or NUXT_OAUTH_AUTH0_CLIENT_SECRET or NUXT_OAUTH_AUTH0_DOMAIN env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }
    const authorizationURL = `https://${config.domain}/authorize`
    const tokenURL = `https://${config.domain}/oauth/token`

    const redirectUrl = getRequestURL(event).href
    if (!code) {
      // Initialize checks
      const checks: Record<string, string> = {}
      if (config.checks?.includes('pkce')) {
        const pkceVerifier = base64URLEncode(randomBytes(32))
        const pkceChallenge = base64URLEncode(sha256(pkceVerifier))
        checks['code_challenge'] = pkceChallenge
        checks['code_challenge_method'] = 'S256'
        setCookie(event, 'nuxt-auth-util-verifier', pkceVerifier, { maxAge: 60 * 15, secure: true, httpOnly: true })
      }
      if (config.checks?.includes('state')) {
        checks['state'] = base64URLEncode(randomBytes(32))
        setCookie(event, 'nuxt-auth-util-state', checks['state'], { maxAge: 60 * 15, secure: true, httpOnly: true })
      }
      config.scope = config.scope || ['openid', 'offline_access']
      if (config.emailRequired && !config.scope.includes('email')) {
        config.scope.push('email')
      }
      // Redirect to Auth0 Oauth page
      return sendRedirect(
        event,
        withQuery(authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
          audience: config.audience || '',
          ...checks
        })
      )
    }

    // Verify checks
    const pkceVerifier = getCookie(event, 'nuxt-auth-util-verifier')
    setCookie(event, 'nuxt-auth-util-verifier', '', { maxAge: -1 })
    const stateInCookie = getCookie(event, 'nuxt-auth-util-state')
    setCookie(event, 'nuxt-auth-util-state', '', { maxAge: -1 })
    if (config.checks?.includes('state')) {
      if (!state || !stateInCookie) {
        const error = createError({
          statusCode: 401,
          message: 'Auth0 login failed: state is missing'
        })
        if (!onError) throw error
        return onError(event, error)
      }
      if (state !== stateInCookie) {
        const error = createError({
          statusCode: 401,
          message: 'Auth0 login failed: state does not match'
        })
        if (!onError) throw error
        return onError(event, error)
      }
    }

    const tokens: any = await ofetch(
      tokenURL as string,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: parsePath(redirectUrl).pathname,
          code,
          code_verifier: pkceVerifier
        }
      }
    ).catch(error => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Auth0 login failed: ${tokens.error?.data?.error_description || 'Unknown error'}`,
        data: tokens
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const tokenType = tokens.token_type
    const accessToken = tokens.access_token
    const user: any = await ofetch(`https://${config.domain}/userinfo`, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`
      }
    })

    return onSuccess(event, {
      tokens,
      user
    })
  })
}
