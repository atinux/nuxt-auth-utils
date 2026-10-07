import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils'
import { randomUUID } from 'uncrypto'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      runtimeConfig: {
        session: {
          password: randomUUID(),
        },
      },
    },
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain('<div>Nuxt Auth Utils</div>')
  })

  it('returns an empty session', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const session = await $fetch('/api/_auth/session')
    // Session should be an object with an `id` property
    expect(session).toBeInstanceOf(Object)
    expect(session).toHaveProperty('id')
  })

  it('replaces existing cookie data in the current and following requests', async () => {
    const seeded = await fetch('/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'set', data: { impersonatorId: 'admin' } }),
    })
    const original = await seeded.json()
    const originalCookie = seeded.headers.getSetCookie().at(-1)!.split(';')[0]!
    const replaced = await fetch('/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cookie': originalCookie },
      body: JSON.stringify({ operation: 'replace', data: { userId: 'user' } }),
    })
    const response = await replaced.json()

    expect(response.result).toEqual({ userId: 'user' })
    expect(response.session).toEqual({ userId: 'user', id: expect.any(String) })
    expect(response.session.id).toBe(original.session.id)

    const replacementCookie = replaced.headers.getSetCookie().at(-1)!.split(';')[0]!
    const session = await $fetch('/api/_auth/session', { headers: { cookie: replacementCookie } })
    expect(session).toEqual({ userId: 'user', id: expect.any(String) })
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
