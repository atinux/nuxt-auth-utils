import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

const rootDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))

function getSetCookie(response: Response, name: string) {
  return response.headers.getSetCookie().find(c => c.startsWith(`${name}=`))
}

describe('with NUXT_SESSION_COOKIE_SECURE=false', async () => {
  await setup({
    rootDir,
    nuxtConfig: {
      runtimeConfig: {
        session: {
          cookie: { secure: true },
        },
      },
    },
    env: { NUXT_APP_SECRET: 'a-test-app-secret-with-at-least-32-characters', NUXT_SESSION_COOKIE_SECURE: 'false' },
  })

  it('sets the session cookie without Secure', async () => {
    const login = await fetch('/api/nuxt-server')
    expect(getSetCookie(login, 'nuxt-auth-session')).toBeDefined()
    expect(getSetCookie(login, 'nuxt-auth-session')).not.toMatch(/; Secure/i)
  })

  it('sets the OAuth state cookie without Secure', async () => {
    const response = await fetch('/auth/google', { redirect: 'manual' })
    expect(getSetCookie(response, 'nuxt-auth-state')).toBeDefined()
    expect(getSetCookie(response, 'nuxt-auth-state')).not.toMatch(/; Secure/i)
  })
})
