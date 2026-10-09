import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils'

describe('without appSecret', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    env: {
      NUXT_APP_SECRET: '',
    },
  })

  it('fails with a 500 error explaining how to set NUXT_APP_SECRET', async () => {
    const response = await fetch('/api/_auth/session', { headers: { accept: 'application/json' } })
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ message: expect.stringContaining('NUXT_APP_SECRET') })
  })
})
