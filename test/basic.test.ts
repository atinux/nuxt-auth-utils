import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
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
    expect(session).toStrictEqual({})
  })
})
