import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch, url } from '@nuxt/test-utils'

const SESSION_COOKIE = 'nuxt-auth-session'

function getCookie(response: Response, name: string) {
  return response.headers.getSetCookie()
    .map(cookie => cookie.split(';')[0]!)
    .findLast(cookie => cookie.startsWith(`${name}=`))
}

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
      },
    },
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain('<div>Nuxt Auth Utils</div>')
  })

  it('fetches the user session during SSR', async () => {
    expect(await $fetch('/me')).toContain('anonymous')

    const login = await fetch('/api/nuxt-server')
    const cookie = getCookie(login, SESSION_COOKIE)!
    const html = await $fetch<string>('/me', { headers: { cookie } })
    expect(html).toContain('{&quot;fromNuxtServer&quot;:true}')
  })

  it('returns an empty session', async () => {
    const response = await fetch('/api/_auth/session')
    const session = await response.json()
    // Session should be an object with an `id` property
    expect(session).toBeInstanceOf(Object)
    expect(session).toHaveProperty('id')
    expect(session).not.toHaveProperty('user')
    expect(getCookie(response, SESSION_COOKIE)).toBeTruthy()
  })

  it('shares the session between `nuxt/server` and `/api/_auth/session`', async () => {
    const response = await fetch('/api/nuxt-server')
    const written = await response.json()
    const cookie = getCookie(response, SESSION_COOKIE)!

    expect(written).toMatchObject({ user: { fromNuxtServer: true } })

    const session = await $fetch('/api/_auth/session', { headers: { cookie } })
    expect(session).toEqual(written)
  })

  it('accepts the event of an h3 v1 handler', async () => {
    const response = await fetch('/api/h3-handler')
    const written = await response.json()
    const cookie = getCookie(response, SESSION_COOKIE)!

    expect(written).toMatchObject({ user: { fromH3: true } })

    // Read from a `nuxt/server` handler and from an h3 handler
    expect(await $fetch('/api/protected', { headers: { cookie } })).toEqual({ user: { fromH3: true } })
    expect(await $fetch('/api/protected-h3', { headers: { cookie } })).toEqual({ user: { fromH3: true } })
  })

  it('requires a user session', async () => {
    for (const path of ['/api/protected', '/api/protected-h3']) {
      const response = await fetch(path, { headers: { accept: 'application/json' } })
      expect(response.status).toBe(401)
    }
  })

  it('ignores session cookies from nuxt-auth-utils < 0.6', async () => {
    const response = await fetch('/api/_auth/session', {
      headers: { cookie: 'nuxt-session=Fe26.2**legacy-sealed-session' },
    })
    const session = await response.json()
    expect(session).not.toHaveProperty('user')
  })

  it('keeps the user session apart from the app `nuxt/server` session', async () => {
    const login = await fetch('/api/nuxt-server')
    const userCookie = getCookie(login, SESSION_COOKIE)!

    const first = await fetch('/api/app-session', { headers: { cookie: userCookie } })
    const appCookie = getCookie(first, 'nuxt-session')!
    expect(await first.json()).toEqual({ visits: 1, user: { fromNuxtServer: true } })
    expect(getCookie(first, SESSION_COOKIE)).toBeUndefined()

    const second = await fetch('/api/app-session', { headers: { cookie: `${userCookie}; ${appCookie}` } })
    expect(await second.json()).toEqual({ visits: 2, user: { fromNuxtServer: true } })
  })

  it('clears the user session', async () => {
    const login = await fetch('/api/nuxt-server')
    const cookie = getCookie(login, SESSION_COOKIE)!

    const logout = await fetch('/api/_auth/session', { method: 'DELETE', headers: { cookie } })
    expect(await logout.json()).toEqual({ loggedOut: true })
    expect(logout.headers.getSetCookie().find(c => c.startsWith(`${SESSION_COOKIE}=`))).toMatch(/Max-Age=0/i)
  })

  it('reads the user session in WebSocket handlers', async () => {
    const login = await fetch('/api/nuxt-server')
    const cookie = getCookie(login, SESSION_COOKIE)!
    const wsURL = url('/ws').replace(/^http/, 'ws')

    const message = await new Promise<string>((resolve, reject) => {
      // @ts-expect-error `headers` is supported by Node.js (undici)
      const ws = new WebSocket(wsURL, { headers: { cookie } })
      ws.addEventListener('message', (event) => {
        resolve(String(event.data))
        ws.close()
      })
      ws.addEventListener('error', reject)
    })
    expect(JSON.parse(message)).toEqual({ user: { fromNuxtServer: true } })

    const rejected = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(wsURL)
      ws.addEventListener('open', () => {
        resolve(false)
        ws.close()
      })
      ws.addEventListener('error', () => resolve(true))
    })
    expect(rejected).toBe(true)
  })

  it('generates state for OAuth authorization requests', async () => {
    const response = await fetch('/auth/google', {
      redirect: 'manual',
    })
    const location = new URL(response.headers.get('location')!)
    const state = location.searchParams.get('state')

    expect(response.status).toBe(302)
    expect(state).toBeTruthy()
    expect(state).not.toBe('configured-state-must-not-override-generated-state')
  })

  it('rejects OAuth callbacks without matching browser state', async () => {
    const response = await $fetch<{ success: boolean, error: string }>('/auth/google', {
      query: {
        code: 'attacker-code',
        state: 'attacker-state',
      },
    })

    expect(response).toEqual({
      success: false,
      error: 'Google login failed: state mismatch',
    })
  })
})
