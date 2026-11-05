import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineOAuthHubspotEventHandler } from '../src/runtime/server/lib/oauth/hubspot'

interface UpstreamRequest {
  url: string
  method: string
  contentType: string
  body: Record<string, string>
}

const upstreamRequests: UpstreamRequest[] = []
const tokenResponse = { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 1800, token_type: 'bearer' }
const activeToken = {
  active: true,
  token: 'access-token',
  client_id: 'client-id',
  user: 'user@domain.com',
  hub_domain: 'meowmix.com',
  scopes: ['oauth'],
  signed_access_token: {},
  hub_id: 1234567,
  app_id: 111111,
  expires_in: 1754,
  user_id: 293199,
  token_use: 'access_token',
  token_type: 'Bearer',
}

vi.mock('nuxt/server', async importOriginal => ({
  ...(await importOriginal<typeof import('nuxt/server')>()),
  defineEventHandler(handler: unknown) {
    return handler
  },
  getQuery: () => ({ code: 'auth-code', state: 'test-state' }),
  sendRedirect(_event: unknown, url: string) {
    return { redirect: url }
  },
  useRuntimeConfig: () => ({}),
  createError(input: { status: number, message: string }) {
    return Object.assign(new Error(input.message), input)
  },
}))

vi.mock('../src/runtime/server/lib/utils', async importOriginal => ({
  ...(await importOriginal<typeof import('../src/runtime/server/lib/utils')>()),
  getOAuthRedirectURL: () => 'https://example.com/auth/hubspot',
  handleState: () => 'test-state',
}))

/** Records the requests the handler sends to the HubSpot API and answers them from `introspect`. */
function stubHubspotApi(introspect: unknown) {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    upstreamRequests.push({
      url: request.url,
      method: request.method,
      contentType: request.headers.get('content-type') || '',
      body: Object.fromEntries(new URLSearchParams(await request.text())),
    })

    return new Response(JSON.stringify(request.url.endsWith('/introspect') ? introspect : tokenResponse), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
}

function runLogin() {
  const onSuccess = vi.fn()
  const onError = vi.fn()
  // The mocked `defineEventHandler` returns the raw handler, and the event is never read.
  const login = defineOAuthHubspotEventHandler({
    config: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectURL: 'https://example.com/auth/hubspot',
    },
    onSuccess,
    onError,
  }) as unknown as (event: unknown) => Promise<unknown>

  return { onSuccess, onError, login }
}

describe('hubspot login flow', () => {
  afterEach(() => {
    upstreamRequests.length = 0
    vi.unstubAllGlobals()
  })

  it('exchanges the authorization code and introspects the access token', async () => {
    stubHubspotApi(activeToken)
    const { onSuccess, login } = runLogin()
    await login({})

    expect(upstreamRequests).toEqual([
      {
        url: 'https://api.hubapi.com/oauth/2026-09/token',
        method: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        body: {
          client_id: 'client-id',
          client_secret: 'client-secret',
          code: 'auth-code',
          redirect_uri: 'https://example.com/auth/hubspot',
          grant_type: 'authorization_code',
        },
      },
      {
        url: 'https://api.hubapi.com/oauth/2026-09/token/introspect',
        method: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        body: {
          client_id: 'client-id',
          client_secret: 'client-secret',
          token: 'access-token',
          token_type_hint: 'access_token',
        },
      },
    ])

    expect(onSuccess).toHaveBeenCalledWith({}, {
      user: { id: 293199, email: 'user@domain.com', domain: 'meowmix.com' },
      tokens: tokenResponse,
    })
  })

  it('reports an inactive access token through onError', async () => {
    stubHubspotApi({ active: false })
    const { onSuccess, onError, login } = runLogin()
    await login({})

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]![1]).toMatchObject({ status: 401 })
  })

  it('reports an introspection error through onError', async () => {
    stubHubspotApi({ error: 'invalid_token', error_description: 'token is invalid' })
    const { onSuccess, onError, login } = runLogin()
    await login({})

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledOnce()
  })
})
