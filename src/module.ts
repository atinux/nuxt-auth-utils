import { defineNuxtModule, addPlugin, createResolver, addImportsDir, addServerImportsDir, addServerHandler } from '@nuxt/kit'
import { sha256 } from 'ohash'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'auth-core',
    configKey: 'auth'
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    if (!process.env.NUXT_SESSION_PASSWORD) {
      console.warn('No session password set, using a random password, please set NUXT_SESSION_PASSWORD in your .env file with at least 32 chars')
      const randomPassword = sha256(`${Date.now()}${Math.random()}`).slice(0, 32)
      console.log(`NUXT_SESSION_PASSWORD=${randomPassword}`)
      process.env.NUXT_SESSION_PASSWORD = randomPassword
    }

    // App
    addImportsDir(resolver.resolve('./runtime/composables'))
    addPlugin(resolver.resolve('./runtime/plugins/session.server'))
    // Server
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.delete'),
      route: '/api/_auth/session',
      method: 'delete'
    })
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.get'),
      route: '/api/_auth/session',
      method: 'get'
    })
  }
})
