import type { H3Event } from 'h3'
import { createError, eventHandler, getQuery, sendRedirect } from 'h3'
import type { Storage, StorageValue } from 'unstorage'
import { NodeOAuthClient, OAuthCallbackError, OAuthResolverError, OAuthResponseError } from '@atproto/oauth-client-node'
import type {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from '@atproto/oauth-client-node'
import { defu } from 'defu'
import { Agent } from '@atproto/api'
import type { AppBskyActorGetProfile } from '@atproto/api'
import { getOAuthRedirectURL, handleMissingConfiguration } from '../utils'
import type { OAuthConfig } from '#auth-utils'
import { useRuntimeConfig, useStorage } from '#imports'

export interface OAuthBlueskyConfig {
  /**
   * The URL on which your app will be deployed. This will be used to enable Bluesky to validate the client.
   * This is only required for production environments.
   * @default process.env.NUXT_OAUTH_BLUESKY_PUBLIC_URL
   */
  publicUrl?: string
  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_BLUESKY_REDIRECT_URL
   */
  redirectURL?: string
  /**
   * Bluesky OAuth Scope. The `atproto` scope is required and will be added if not present.
   * @default ['atproto']
   * @see https://atproto.com/specs/oauth#authorization-scopes
   * @example ['atproto', 'transition:generic']
   */
  scope?: string[]
  /**
   * Human-readable name of the client.
   */
  clientName?: string
  /**
   *  This is a homepage URL for the client. If provided, the client_uri must have the same hostname as client_id.
   */
  clientUri?: string
}

type BlueSkyUser = AppBskyActorGetProfile.Response['data'] | null
type BlueSkyTokens = NodeSavedSession['tokenSet']

export function defineOAuthBlueskyEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBlueskyConfig, BlueSkyUser, BlueSkyTokens>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.bluesky) as OAuthBlueskyConfig

    config.scope ||= []
    if (!config.scope.includes('atproto')) {
      // atproto is a required scope
      config.scope.push('atproto')
    }

    const scope = config.scope.join(' ')

    // For local development, Bluesky authorization servers allow "http://localhost" as a special value
    const dev = import.meta.dev

    if ((!dev && !config.publicUrl)) {
      const requiredFields = [!dev && 'publicUrl'].filter(Boolean) as string[]
      return handleMissingConfiguration(event, 'bluesky', requiredFields, onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)

    const storage = useStorage()
    const sessionStore = new SessionStore(storage)
    const stateStore = new StateStore(storage)

    const client = new NodeOAuthClient({
      stateStore,
      sessionStore,
      // Todo: This needs to be exposed publicly so that the authorization server can validate the client
      // It is not verified by Bluesky yet, but it might be in the future
      clientMetadata: {
        client_name: config?.clientName,
        client_uri: config?.clientUri,
        client_id: dev
          ? `http://localhost?redirect_uri=${encodeURIComponent(redirectURL)}&scope=${encodeURIComponent(scope)}`
          : `${config.publicUrl}/client-metadata.json`,
        redirect_uris: [redirectURL],
        scope,
        grant_types: ['authorization_code', 'refresh_token'],
        application_type: 'web',
        token_endpoint_auth_method: 'none',
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
      const profile = scope.includes('transition:generic')
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
