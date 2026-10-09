import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

const rootDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))

function getCookie(response: Response, name: string) {
  return response.headers.getSetCookie().find(c => c.startsWith(`${name}=`))?.split(';')[0]
}

describe('with the session name of `useSession()`', async () => {
  await setup({ rootDir, env: { NUXT_APP_SECRET: 'a-test-app-secret-with-at-least-32-characters', NUXT_SESSION_NAME: 'nuxt-session' } })

  it('keeps the user session apart from the app session', async () => {
    const login = await fetch('/api/nuxt-server')
    const userCookie = getCookie(login, 'nuxt-auth-session')!
    expect(userCookie).toBeDefined()

    const visit = await fetch('/api/app-session', { headers: { cookie: userCookie } })
    const appCookie = getCookie(visit, 'nuxt-session')!

    const session = await fetch('/api/_auth/session', { headers: { cookie: `${userCookie}; ${appCookie}` } })
    expect(await session.json()).toEqual({ user: { fromNuxtServer: true }, id: expect.any(String) })
  })
})
