import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'
import { handleAccessTokenErrorResponse, handleMissingConfiguration, getOAuthRedirectURL, requestAccessToken, handlePkceVerifier } from '../utils'
import { useRuntimeConfig, createError } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthKickConfig {
  /**
   * Kick Client ID
   * @default process.env.NUXT_OAUTH_KICK_CLIENT_ID
   */
  clientId?: string

  /**
   * Kick OAuth Client Secret
   * @default process.env.NUXT_OAUTH_KICK_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Kick OAuth Scope
   * @default []
   * @see https://docs.kick.com/getting-started/scopes
   * @example ['channel:read']
   */
  scope?: string[]

  /**
   * Kick OAuth Authorization URL
   * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow#authorization-endpoint
   * @default 'https://id.kick.com/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * Kick OAuth Token URL
   * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow#token-endpoint
   * @default 'https://id.kick.com/oauth/token'
   */
  tokenURL?: string

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_KICK_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

export function defineOAuthKickEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthKickConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.kick, {
      authorizationURL: 'https://id.kick.com/oauth/authorize',
      tokenURL: 'https://id.kick.com/oauth/token',
    }) as OAuthKickConfig
    const query = getQuery<{ code?: string }>(event)
    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'kick', ['clientId', 'clientSecret'], onError)
    }

    // Create pkce verifier
    const verifier = await handlePkceVerifier(event)

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    if (!query.code) {
      config.scope = config.scope || []
      if (!config.scope.includes('user:read'))
        config.scope.push('user:read')

      // Redirect to Kick Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
          state: randomUUID(),
          code_challenge: verifier.code_challenge,
          code_challenge_method: verifier.code_challenge_method,
        }),
      )
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        redirect_uri: redirectURL,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: query.code,
        code_verifier: verifier.code_verifier,
      },
    })

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'kick', tokens, onError)
    }
    const accessToken = tokens.access_token

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data }: any = await $fetch('https://api.kick.com/public/v1/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!data || !data.length) {
      const error = createError({
        statusCode: 500,
        message: 'Could not get Kick user',
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const user = data[0]

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
