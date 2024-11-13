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
import { handleMissingConfiguration } from '../utils'
import type { OAuthConfig } from '#auth-utils'
import { useRuntimeConfig, useStorage } from '#imports'

export interface OAuthBlueskyConfig {
  publicUrl?: string
  redirectURL: string
  scope: string[]
  clientName?: string
  clientUri?: string
}

type BlueSkyUser = AppBskyActorGetProfile.Response['data'] | null
type BlueSkyTokens = NodeSavedSession['tokenSet']

export function defineOAuthBlueskyEventHandler({ config, onSuccess, onError }: OAuthConfig<OAuthBlueskyConfig, BlueSkyUser, BlueSkyTokens>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.bluesky, {
      scope: [],
    }) as OAuthBlueskyConfig

    // atproto is a required scope
    if (!config.scope.includes('atproto')) {
      config.scope.push('atproto')
    }

    const scope = config.scope.join(' ')

    // For local development, Bluesky authorization servers allow "http://localhost" as a special value
    const dev = import.meta.dev

    if (!config.redirectURL || (!dev && !config.publicUrl)) {
      const requiredFields = ['redirectURL', dev && 'publicUrl'].filter(Boolean) as string[]
      return handleMissingConfiguration(event, 'bluesky', requiredFields, onError)
    }

    const storage = useStorage()
    const sessionStore = new SessionStore(storage)
    const stateStore = new StateStore(storage)

    const client = new NodeOAuthClient({
      stateStore,
      sessionStore,
      // Todo: This needs to be exposed publicly so that the authorization server can validate the client
      clientMetadata: {
        client_name: config?.clientName,
        client_uri: config?.clientUri,
        client_id: dev
          ? `http://localhost?redirect_uri=${encodeURIComponent(config.redirectURL)}&scope=${encodeURIComponent(scope)}`
          : `${config?.publicUrl}/client-metadata.json`,
        redirect_uris: [config.redirectURL],
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
          message: 'Missing Bluesky handle',
        })

        const url = await client.authorize(handle, {
          scope,
        })
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
      const profile = scope.includes('transition:generic') ? (await new Agent(session).getProfile({ actor: session.did })).data : null

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
