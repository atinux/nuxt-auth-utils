import type { H3Event } from 'h3'
import { createError, eventHandler, getQuery, getRequestURL, sendRedirect } from 'h3'
import type { Storage, StorageValue } from 'unstorage'
import { NodeOAuthClient, OAuthCallbackError, OAuthResolverError, OAuthResponseError } from '@atproto/oauth-client-node'
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
  OAuthGrantType,
} from '@atproto/oauth-client-node'
import { Agent } from '@atproto/api'
import type { AppBskyActorGetProfile } from '@atproto/api'
import { getOAuthRedirectURL } from '../utils'
import type { OAuthConfig } from '#auth-utils'
import { useRuntimeConfig, useStorage } from '#imports'
import type { AtprotoProviderClientMetadata } from '~/src/runtime/types/atproto'

export interface OAuthBlueskyConfig {
  /**
   * Redirect URL to use for this authorization flow. It should only consist of the path, as the hostname must always match the client id's hostname.
   * @default process.env.NUXT_OAUTH_BLUESKY_REDIRECT_URL
   * @example '/auth/bluesky'
   */
  redirectUrl?: string
  /**
   * Bluesky OAuth Scope. The `atproto` scope is required and will be added if not present.
   * @default ['atproto']
   * @see https://atproto.com/specs/oauth#authorization-scopes
   * @example ['atproto', 'transition:generic']
   */
  scope?: string[]
}

type BlueSkyUser = AppBskyActorGetProfile.Response['data'] | null
type BlueSkyTokens = NodeSavedSession['tokenSet']

export function defineOAuthBlueskyEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBlueskyConfig, BlueSkyUser, BlueSkyTokens>) {
  return eventHandler(async (event: H3Event) => {
    const blueskyRuntimeConfig = useRuntimeConfig(event).oauth.bluesky as AtprotoProviderClientMetadata

    const scopes = [...new Set(['atproto', ...config?.scope ?? [], ...blueskyRuntimeConfig.scope ?? []])]
    const scope = scopes.join(' ')

    const grantTypes = [...new Set(['authorization_code', ...blueskyRuntimeConfig.grantTypes ?? []])] as [OAuthGrantType, ...OAuthGrantType[]]

    const requestURL = getRequestURL(event)
    const baseUrl = `${requestURL.protocol}//${requestURL.host}`

    /**
     * The redirect URL must be a valid URL, so we need to parse it to ensure it is correct. Will use the following order:
     * 1. URL provided as part of the config of the event handler, on the condition that it was listed in the redirect URIs.
     * 2. First URL provided in the runtime config.
     * 3. The URL of the current request.
     */
    const redirectURL = new URL(
      (config?.redirectUrl && baseUrl + config.redirectUrl)
      || (blueskyRuntimeConfig.redirectUris[0] && baseUrl + blueskyRuntimeConfig.redirectUris[0])
      || getOAuthRedirectURL(event),
    )

    const dev = import.meta.dev
    if (dev && redirectURL.hostname === 'localhost') {
      // For local development, Bluesky authorization servers allow "http://127.0.0.1" as a special value for redirect URIs
      redirectURL.hostname = '127.0.0.1'
    }
    const redirectUris = (blueskyRuntimeConfig.redirectUris.length ? blueskyRuntimeConfig.redirectUris : [requestURL.pathname])
      .map(uri => new URL(`${redirectURL.protocol}//${redirectURL.host}${uri}`).toString()) as [string, ...string[]]

    const clientId = dev
      // For local development, Bluesky authorization servers allow "http://localhost" as a special value for the client
      ? `http://localhost?redirect_uri=${encodeURIComponent(redirectURL.toString())}&scope=${encodeURIComponent(scope)}`
      : `${baseUrl}/${blueskyRuntimeConfig.clientMetadataFilename || 'bluesky/client-metadata.json'}`

    const storage = useStorage()
    const sessionStore = new SessionStore(storage)
    const stateStore = new StateStore(storage)

    const client = new NodeOAuthClient({
      stateStore,
      sessionStore,
      // Todo: This needs to be exposed publicly so that the authorization server can validate the client
      // It is not verified by Bluesky yet, but it might be in the future
      clientMetadata: {
        client_name: blueskyRuntimeConfig.clientName || undefined,
        client_uri: blueskyRuntimeConfig.clientUri || undefined,
        logo_uri: blueskyRuntimeConfig.logoUri || undefined,
        policy_uri: blueskyRuntimeConfig.policyUri || undefined,
        tos_uri: blueskyRuntimeConfig.tosUri || undefined,
        client_id: clientId,
        redirect_uris: redirectUris,
        scope,
        grant_types: grantTypes,
        application_type: blueskyRuntimeConfig.applicationType,
        token_endpoint_auth_method: blueskyRuntimeConfig.tokenEndpointAuthMethod,
        dpop_bound_access_tokens: true,
      },
    })

    const query = getQuery(event)

    if (!query.code) {
      try {
        const handle = query.handle?.toString()
        if (!handle) throw createError({
          statusCode: 400,
          message: 'Query parameter `handle` empty or missing. Please provide a valid Bluesky handle.',
        })

        const url = await client.authorize(handle, { scope })
        return sendRedirect(event, url.toString())
      }
      catch (err) {
        const error = (() => {
          switch (true) {
            case err instanceof OAuthResponseError:
              return createError({
                statusCode: 500,
                message: `Bluesky login failed: ${err.errorDescription || 'Unknown error'}`,
                data: err.payload,
              })

            case err instanceof OAuthResolverError:
              return createError({
                statusCode: 400,
                message: `Bluesky login failed: ${err.message || 'Unknown error'}`,
              })

            default:
              throw err
          }
        })()

        if (!onError) throw error
        return onError(event, error)
      }
    }

    try {
      const { session } = await client.callback(new URLSearchParams(query as Record<string, string>))
      const sessionInfo = await sessionStore.get(session.did)
      const profile = scopes.includes('transition:generic')
        ? (await new Agent(session).getProfile({ actor: session.did })).data
        : null

      return onSuccess(event, {
        user: profile,
        tokens: sessionInfo!.tokenSet,
      })
    }
    catch (err) {
      if (!(err instanceof OAuthCallbackError)) throw err
      const error = createError({
        statusCode: 500,
        message: `Bluesky login failed: ${err.message || 'Unknown error'}`,
      })
      if (!onError) throw error
      return onError(event, error)
    }
  })
}

export class StateStore implements NodeSavedStateStore {
  private readonly keyPrefix = 'oauth:bluesky:state:'

  constructor(private storage: Storage<StorageValue>) {}

  async get(key: string): Promise<NodeSavedState | undefined> {
    const result = await this.storage.get<NodeSavedState>(this.keyPrefix + key)
    if (!result) return
    return result
  }

  async set(key: string, val: NodeSavedState) {
    await this.storage.set(this.keyPrefix + key, val)
  }

  async del(key: string) {
    await this.storage.del(this.keyPrefix + key)
  }
}

export class SessionStore implements NodeSavedSessionStore {
  private readonly keyPrefix = 'oauth:bluesky:session:'

  constructor(private storage: Storage<StorageValue>) {}

  async get(key: string): Promise<NodeSavedSession | undefined> {
    const result = await this.storage.get<NodeSavedSession>(this.keyPrefix + key)
    if (!result) return
    return result
  }

  async set(key: string, val: NodeSavedSession) {
    await this.storage.set(this.keyPrefix + key, val)
  }

  async del(key: string) {
    await this.storage.del(this.keyPrefix + key)
  }
}
