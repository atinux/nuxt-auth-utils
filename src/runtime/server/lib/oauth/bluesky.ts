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
import { Agent } from '@atproto/api'
import type { AppBskyActorGetProfile } from '@atproto/api'
import { getAtprotoClientMetadata } from '../../utils/atproto'
import type { OAuthConfig } from '#auth-utils'
import { useStorage } from '#imports'

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
    const clientMetadata = getAtprotoClientMetadata(event, 'bluesky', config)
    const scopes = clientMetadata.scope?.split(' ') ?? []

    const storage = useStorage()
    const sessionStore = new SessionStore(storage)
    const stateStore = new StateStore(storage)

    const client = new NodeOAuthClient({
      stateStore,
      sessionStore,
      // Todo: This needs to be exposed publicly so that the authorization server can validate the client
      // It is not verified by Bluesky yet, but it might be in the future
      clientMetadata: clientMetadata,
    })

    const query = getQuery(event)

    if (!query.code) {
      try {
        const handle = query.handle?.toString()
        if (!handle) throw createError({
          statusCode: 400,
          message: 'Query parameter `handle` empty or missing. Please provide a valid Bluesky handle.',
        })

        const url = await client.authorize(handle, { scope: clientMetadata.scope })
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
