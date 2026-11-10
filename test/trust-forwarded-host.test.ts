import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

const rootDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))

describe('with NUXT_AUTH_TRUST_FORWARDED_HOST=true', async () => {
  await setup({
    rootDir,
    env: {
      NUXT_APP_SECRET: 'a-test-app-secret-with-at-least-32-characters',
      NUXT_AUTH_TRUST_FORWARDED_HOST: 'true',
    },
  })

  it('builds the OAuth redirect URI from the forwarded host', async () => {
    const response = await fetch('/auth/google', {
      redirect: 'manual',
      headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'auth.example.com' },
    })
    const redirectUri = new URL(response.headers.get('location')!).searchParams.get('redirect_uri')

    expect(redirectUri).toBe('https://auth.example.com/auth/google')
  })
})
