import { writeFile, readFile } from 'node:fs/promises'
import { defineNuxtModule, addPlugin, createResolver, addImportsDir, addServerHandler } from '@nuxt/kit'
import { join } from 'pathe'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'auth-utils',
    configKey: 'auth',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#auth-utils'] = resolver.resolve('./runtime/types/index')

    // App
    addImportsDir(resolver.resolve('./runtime/composables'))
    addPlugin(resolver.resolve('./runtime/plugins/session.server'))
    // Server
    if (nuxt.options.nitro.imports !== false) {
      // TODO: address https://github.com/Atinux/nuxt-auth-utils/issues/1 upstream in unimport
      nuxt.options.nitro.imports = defu(nuxt.options.nitro.imports, {
        presets: [
          {
            from: resolver.resolve('./runtime/server/utils/oauth'),
            imports: ['oauth'],
          },
          {
            from: resolver.resolve('./runtime/server/utils/session'),
            imports: [
              'sessionHooks',
              'getUserSession',
              'setUserSession',
              'replaceUserSession',
              'clearUserSession',
              'requireUserSession',
            ],
          },
        ],
      })
    }
    // Waiting for https://github.com/nuxt/nuxt/pull/24000/files
    // addServerImportsDir(resolver.resolve('./runtime/server/utils'))
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.delete'),
      route: '/api/_auth/session',
      method: 'delete',
    })
    addServerHandler({
      handler: resolver.resolve('./runtime/server/api/session.get'),
      route: '/api/_auth/session',
      method: 'get',
    })

    // Runtime Config
    const runtimeConfig = nuxt.options.runtimeConfig
    runtimeConfig.session = defu(runtimeConfig.session, {
      name: 'nuxt-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        sameSite: 'lax',
      },
    })

    // Generate the session password
    if (nuxt.options.dev && !runtimeConfig.session.password) {
      runtimeConfig.session.password = randomUUID().replace(/-/g, '')
      // Add it to .env
      const envPath = join(nuxt.options.rootDir, '.env')
      const envContent = await readFile(envPath, 'utf-8').catch(() => '')
      if (!envContent.includes('NUXT_SESSION_PASSWORD')) {
        await writeFile(envPath, `${envContent ? envContent + '\n' : envContent}NUXT_SESSION_PASSWORD=${runtimeConfig.session.password}`, 'utf-8')
      }
    }

    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    // GitHub OAuth
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, {
      clientId: '',
      clientSecret: '',
    })
    // Spotify OAuth
    runtimeConfig.oauth.spotify = defu(runtimeConfig.oauth.spotify, {
      clientId: '',
      clientSecret: '',
    })
    // Google OAuth
    runtimeConfig.oauth.google = defu(runtimeConfig.oauth.google, {
      clientId: '',
      clientSecret: '',
    })
    // Twitch OAuth
    runtimeConfig.oauth.twitch = defu(runtimeConfig.oauth.twitch, {
      clientId: '',
      clientSecret: '',
    })
    // Auth0 OAuth
    runtimeConfig.oauth.auth0 = defu(runtimeConfig.oauth.auth0, {
      clientId: '',
      clientSecret: '',
      domain: '',
      audience: '',
    })
    // Microsoft OAuth
    runtimeConfig.oauth.microsoft = defu(runtimeConfig.oauth.microsoft, {
      clientId: '',
      clientSecret: '',
      tenant: '',
      scope: [],
      authorizationURL: '',
      tokenURL: '',
      userURL: '',
    })
    // Discord OAuth
    runtimeConfig.oauth.discord = defu(runtimeConfig.oauth.discord, {
      clientId: '',
      clientSecret: '',
    })
    // Battle.net OAuth
    runtimeConfig.oauth.battledotnet = defu(runtimeConfig.oauth.battledotnet, {
      clientId: '',
      clientSecret: '',
    })
    // Keycloak OAuth
    runtimeConfig.oauth.keycloak = defu(runtimeConfig.oauth.keycloak, {
      clientId: '',
      clientSecret: '',
      serverUrl: '',
      realm: '',
    })
    // LinkedIn OAuth
    runtimeConfig.oauth.linkedin = defu(runtimeConfig.oauth.linkedin, {
      clientId: '',
      clientSecret: '',
    })
    // Cognito OAuth
    runtimeConfig.oauth.cognito = defu(runtimeConfig.oauth.cognito, {
      clientId: '',
      clientSecret: '',
      region: '',
      userPoolId: '',
    })
  },
})
