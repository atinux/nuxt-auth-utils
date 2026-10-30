import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

const rootDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))

function getCookie(response: Response, name: string) {
  return response.headers.getSetCookie().find(c => c.startsWith(`${name}=`))?.split(';')[0]
}

describe('with NUXT_SESSION_NAME', async () => {
  await setup({ rootDir, env: { NUXT_APP_SECRET: 'a-test-app-secret-with-at-least-32-characters', NUXT_SESSION_NAME: 'custom-session' } })

  it('names the session cookie at runtime', async () => {
    const login = await fetch('/api/nuxt-server')
    expect(getCookie(login, 'custom-session')).toBeDefined()
    expect(getCookie(login, 'nuxt-auth-session')).toBeUndefined()
  })
})
