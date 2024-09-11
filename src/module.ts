import { writeFile, readFile } from 'node:fs/promises'
import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addImportsDir,
  addServerHandler,
  addServerPlugin,
  addServerImportsDir,
  addComponentsDir,
} from '@nuxt/kit'
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

    nuxt.options.alias['#auth-utils'] = resolver.resolve(
      './runtime/types/index',
    )

    // App
    addComponentsDir({ path: resolver.resolve('./runtime/app/components') })
    addImportsDir(resolver.resolve('./runtime/app/composables'))
    addPlugin(resolver.resolve('./runtime/app/plugins/session.server'))
    addPlugin(resolver.resolve('./runtime/app/plugins/session.client'))
    // Server
    addServerPlugin(resolver.resolve('./runtime/server/plugins/oauth'))
    addServerImportsDir(resolver.resolve('./runtime/server/lib/oauth'))
    addServerImportsDir(resolver.resolve('./runtime/server/lib/webauthn'))
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))
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
    const envSessionPassword = `${
      runtimeConfig.nitro?.envPrefix || 'NUXT_'
    }SESSION_PASSWORD`

    runtimeConfig.session = defu(runtimeConfig.session, {
      name: 'nuxt-session',
      password: process.env[envSessionPassword] || '',
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
      if (!envContent.includes(envSessionPassword)) {
        await writeFile(
          envPath,
          `${
            envContent ? envContent + '\n' : envContent
          }${envSessionPassword}=${runtimeConfig.session.password}`,
          'utf-8',
        )
      }
    }

    // WebAuthn settings
    runtimeConfig.webauthn = defu(runtimeConfig.webauthn, {})
    runtimeConfig.webauthn.registrationOptions = defu(runtimeConfig.webauthn.registrationOptions, {}) // TODO: add default values
    runtimeConfig.webauthn.authenticationOptions = defu(runtimeConfig.webauthn.authenticationOptions, {}) // TODO: add default values

    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    // GitHub OAuth
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // GitHub OAuth
    runtimeConfig.oauth.gitlab = defu(runtimeConfig.oauth.gitlab, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Spotify OAuth
    runtimeConfig.oauth.spotify = defu(runtimeConfig.oauth.spotify, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Google OAuth
    runtimeConfig.oauth.google = defu(runtimeConfig.oauth.google, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Twitch OAuth
    runtimeConfig.oauth.twitch = defu(runtimeConfig.oauth.twitch, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Auth0 OAuth
    runtimeConfig.oauth.auth0 = defu(runtimeConfig.oauth.auth0, {
      clientId: '',
      clientSecret: '',
      domain: '',
      audience: '',
      redirectURL: '',
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
      redirectURL: '',
    })
    // Discord OAuth
    runtimeConfig.oauth.discord = defu(runtimeConfig.oauth.discord, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Battle.net OAuth
    runtimeConfig.oauth.battledotnet = defu(runtimeConfig.oauth.battledotnet, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Keycloak OAuth
    runtimeConfig.oauth.keycloak = defu(runtimeConfig.oauth.keycloak, {
      clientId: '',
      clientSecret: '',
      serverUrl: '',
      realm: '',
      redirectURL: '',
    })
    // LinkedIn OAuth
    runtimeConfig.oauth.linkedin = defu(runtimeConfig.oauth.linkedin, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Cognito OAuth
    runtimeConfig.oauth.cognito = defu(runtimeConfig.oauth.cognito, {
      clientId: '',
      clientSecret: '',
      region: '',
      userPoolId: '',
      redirectURL: '',
    })
    // Facebook OAuth
    runtimeConfig.oauth.facebook = defu(runtimeConfig.oauth.facebook, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Instagram OAuth
    runtimeConfig.oauth.instagram = defu(runtimeConfig.oauth.instagram, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // PayPal OAuth
    runtimeConfig.oauth.paypal = defu(runtimeConfig.oauth.paypal, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Steam OAuth
    runtimeConfig.oauth.steam = defu(runtimeConfig.oauth.steam, {
      apiKey: '',
      redirectURL: '',
    })
    // X OAuth
    runtimeConfig.oauth.x = defu(runtimeConfig.oauth.x, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // XSUAA OAuth
    runtimeConfig.oauth.xsuaa = defu(runtimeConfig.oauth.xsuaa, {
      clientId: '',
      clientSecret: '',
      domain: '',
      redirectURL: '',
    })
    // VK OAuth
    runtimeConfig.oauth.vk = defu(runtimeConfig.oauth.vk, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Yandex OAuth
    runtimeConfig.oauth.yandex = defu(runtimeConfig.oauth.yandex, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // TikTok OAuth
    runtimeConfig.oauth.tiktok = defu(runtimeConfig.oauth.tiktok, {
      clientKey: '',
      clientSecret: '',
      redirectURL: '',
    })
  },
})
