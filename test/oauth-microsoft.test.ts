import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineOAuthMicrosoftEventHandler } from '../src/runtime/server/lib/oauth/microsoft'

interface UpstreamRequest {
  url: string
  method: string
  authorization: string
  body: Record<string, string>
}

const upstreamRequests: UpstreamRequest[] = []
const tokenResponse = { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600, token_type: 'Bearer' }
const user = { id: 'user-id', displayName: 'Ada Lovelace', mail: 'ada@example.com' }

// The query of the request under test: empty for the first leg, `code` and `state` for the callback.
const request = vi.hoisted(() => ({ query: {} as Record<string, string> }))

vi.mock('nuxt/server', async importOriginal => ({
  ...(await importOriginal<typeof import('nuxt/server')>()),
  defineEventHandler(handler: unknown) {
    return handler
  },
  getQuery: () => request.query,
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
  getOAuthRedirectURL: () => 'https://example.com/auth/microsoft',
  handleState: () => 'test-state',
  // What `handlePkceVerifier` returns: the challenge on the first leg, the stored verifier on the callback.
  handlePkceVerifier: () => request.query.code
    ? { code_verifier: 'test-verifier' }
    : { code_verifier: 'test-verifier', code_challenge: 'test-challenge', code_challenge_method: 'S256' },
}))

/** Records the requests the handler sends to Microsoft and answers the token and the user request. */
function stubMicrosoftApi() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const upstream = new Request(input, init)
    const isToken = upstream.url.endsWith('/oauth2/v2.0/token')
    upstreamRequests.push({
      url: upstream.url,
      method: upstream.method,
      authorization: upstream.headers.get('authorization') || '',
      body: Object.fromEntries(new URLSearchParams(await upstream.text())),
    })

    return new Response(JSON.stringify(isToken ? tokenResponse : user), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
}

function runLogin(authorizationParams?: Record<string, string>) {
  const onSuccess = vi.fn()
  const onError = vi.fn()
  // The mocked `defineEventHandler` returns the raw handler, and the event is never read.
  const login = defineOAuthMicrosoftEventHandler({
    config: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tenant: 'tenant-id',
      redirectURL: 'https://example.com/auth/microsoft',
      authorizationParams,
    },
    onSuccess,
    onError,
  }) as unknown as (event: unknown) => Promise<unknown>

  return { onSuccess, onError, login }
}

describe('microsoft login flow', () => {
  afterEach(() => {
    request.query = {}
    upstreamRequests.length = 0
    vi.unstubAllGlobals()
  })

  it('sends the PKCE challenge with the authorization request', async () => {
    const { login } = runLogin()
    const { redirect } = await login({}) as { redirect: string }

    const url = new URL(redirect)
    expect(`${url.origin}${url.pathname}`).toBe('https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-id',
      response_type: 'code',
      redirect_uri: 'https://example.com/auth/microsoft',
      scope: 'User.Read',
      code_challenge: 'test-challenge',
      code_challenge_method: 'S256',
      state: 'test-state',
    })
  })

  it('does not let `authorizationParams` replace the PKCE challenge', async () => {
    const { login } = runLogin({ code_challenge: 'other-challenge', code_challenge_method: 'plain', prompt: 'select_account' })
    const { redirect } = await login({}) as { redirect: string }

    const params = new URL(redirect).searchParams
    expect(params.get('code_challenge')).toBe('test-challenge')
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('prompt')).toBe('select_account')
  })

  it('sends the PKCE verifier with the token request', async () => {
    request.query = { code: 'auth-code', state: 'test-state' }
    stubMicrosoftApi()
    const { onSuccess, onError, login } = runLogin()
    await login({})

    expect(upstreamRequests).toEqual([
      {
        url: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
        method: 'POST',
        authorization: '',
        body: {
          grant_type: 'authorization_code',
          code: 'auth-code',
          client_id: 'client-id',
          client_secret: 'client-secret',
          redirect_uri: 'https://example.com/auth/microsoft',
          code_verifier: 'test-verifier',
        },
      },
      {
        url: 'https://graph.microsoft.com/v1.0/me',
        method: 'GET',
        authorization: 'Bearer access-token',
        body: {},
      },
    ])

    expect(onError).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({}, { tokens: tokenResponse, user })
  })
})
