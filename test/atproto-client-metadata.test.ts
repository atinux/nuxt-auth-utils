import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setup, $fetch, url } from '@nuxt/test-utils'

interface ClientMetadata {
  client_id: string
  redirect_uris: string[]
}

describe('AT Protocol client metadata', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
      },
    },
  })

  it('publishes the callback path the login flow uses', async () => {
    const origin = new URL(url('/')).origin

    // The login route computes its own metadata, the module serves the published document from
    // `/bluesky/client-metadata.json`. The authorization server compares the redirect URI of the
    // login request with the published list, so both must name the same callback.
    const login = await $fetch<ClientMetadata>('/auth/bluesky')
    const published = await $fetch<ClientMetadata>('/bluesky/client-metadata.json')

    expect(login.redirect_uris).toEqual([`${origin}/auth/bluesky`])
    expect(published.redirect_uris).toEqual(login.redirect_uris)
  })
})

describe('AT Protocol client metadata under a base URL', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      app: {
        baseURL: '/my-app/',
      },
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
      },
    },
  })

  it('includes the base URL in the callback path', async () => {
    const origin = new URL(url('/')).origin

    const login = await $fetch<ClientMetadata>('/my-app/auth/bluesky')
    const published = await $fetch<ClientMetadata>('/my-app/bluesky/client-metadata.json')

    expect(login.redirect_uris).toEqual([`${origin}/my-app/auth/bluesky`])
    expect(published.redirect_uris).toEqual(login.redirect_uris)
  })
})

describe('AT Protocol client metadata in a production build', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    build: true,
    nuxtConfig: {
      app: {
        baseURL: '/my-app/',
      },
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
      },
    },
  })

  it('publishes a client ID the authorization server can fetch', async () => {
    const origin = new URL(url('/')).origin

    const login = await $fetch<ClientMetadata>('/my-app/auth/bluesky')
    const published = await $fetch<ClientMetadata>('/my-app/bluesky/client-metadata.json')

    // The authorization server reads the document from the client ID, so it has to name the URL
    // the document is served from, under the base URL the app runs with.
    expect(published.client_id).toBe(`${origin}/my-app/bluesky/client-metadata.json`)
    expect(await $fetch<ClientMetadata>(new URL(published.client_id).pathname)).toEqual(published)
    expect(published.redirect_uris).toEqual(login.redirect_uris)
  })
})

describe('AT Protocol client metadata with a configured callback path', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
        oauth: {
          bluesky: {
            redirectUris: ['/login/bluesky'],
          },
        },
      },
    },
  })

  it('replaces the convention instead of being added to it', async () => {
    const origin = new URL(url('/')).origin

    const login = await $fetch<ClientMetadata>('/auth/bluesky')
    const published = await $fetch<ClientMetadata>('/bluesky/client-metadata.json')

    expect(login.redirect_uris).toEqual([`${origin}/login/bluesky`])
    expect(published.redirect_uris).toEqual(login.redirect_uris)
  })
})
