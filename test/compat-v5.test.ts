import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils'

describe('future.compatibilityVersion: 5', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      future: {
        compatibilityVersion: 5,
      },
      experimental: {
        routeTypedFetch: true,
      },
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
      },
    },
  })

  it('sets and reads the user session', async () => {
    const response = await fetch('/api/nuxt-server')
    const written = await response.json()
    const cookie = response.headers.getSetCookie()
      .map(c => c.split(';')[0]!)
      .findLast(c => c.startsWith('nuxt-auth-session='))!

    expect(written).toMatchObject({ user: { fromNuxtServer: true } })
    expect(await $fetch('/api/protected', { headers: { cookie } })).toEqual({ user: { fromNuxtServer: true } })
  })

  it('redirects to the OAuth provider', async () => {
    const response = await fetch('/auth/google', { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toMatch(/^https:\/\/accounts\.example\.com\/authorize\?/)
  })
})
