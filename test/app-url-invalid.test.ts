import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

const rootDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))

describe('with an invalid NUXT_APP_URL', async () => {
  await setup({
    rootDir,
    env: {
      NUXT_APP_SECRET: 'a-test-app-secret-with-at-least-32-characters',
      // No scheme, so it is not an absolute URL
      NUXT_APP_URL: 'auth.example.com',
    },
  })

  it('fails the login instead of falling back to the request host', async () => {
    const response = await fetch('/auth/google', { redirect: 'manual' })
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toContain('NUXT_APP_URL')
  })

  it('still uses an absolute provider redirect URL', async () => {
    const response = await fetch('/auth/steam', { redirect: 'manual' })

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.searchParams.get('openid.return_to')).toMatch(/^https:\/\/steam\.example\.com\/auth\/steam\?state=/)
    expect(location.searchParams.get('openid.realm')).toBe('https://steam.example.com')
  })
})

describe('with a non-HTTP NUXT_APP_URL', async () => {
  await setup({
    rootDir,
    env: {
      NUXT_APP_SECRET: 'a-test-app-secret-with-at-least-32-characters',
      NUXT_APP_URL: 'ftp://example.com',
    },
  })

  it('fails the login instead of building a callback a browser cannot open', async () => {
    const response = await fetch('/auth/google', { redirect: 'manual' })
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toContain('NUXT_APP_URL')
  })
})
