import { writeFile, readFile } from 'node:fs/promises'
import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addImports,
  addServerHandler,
  addServerPlugin,
  addServerImportsDir,
  addComponentsDir,
  logger,
} from '@nuxt/kit'
import { join } from 'pathe'
import { defu } from 'defu'
import { randomUUID } from 'uncrypto'
import type { ScryptConfig } from '@adonisjs/hash/types'
import type { SessionConfig } from 'h3'
import { atprotoProviderDefaultClientMetadata, atprotoProviders, getClientMetadataFilename } from './runtime/utils/atproto'
import type { AtprotoProviderClientMetadata } from './runtime/types/atproto'

// Module options TypeScript interface definition
export interface ModuleOptions {
  /**
   * Enable WebAuthn (Passkeys)
   * @default false
   */
  webAuthn?: boolean
  /**
   * Enable atproto OAuth (Bluesky, etc.)
   * @default false
   */
  atproto?: boolean
  /**
   * Hash options used for password hashing
   */
  hash?: {
    /**
     * scrypt options used for password hashing
     */
    scrypt?: ScryptConfig
  }
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    hash: {
      scrypt: ScryptConfig
    }
    /**
     * Session configuration
     */
    session: SessionConfig
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'auth-utils',
    configKey: 'auth',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    webAuthn: false,
    atproto: false,
    hash: {
      scrypt: {},
    },
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#auth-utils'] = resolver.resolve(
      './runtime/types/index',
    )

    const composables = [
      { name: 'useUserSession', from: resolver.resolve('./runtime/app/composables/session') },
    ]

    if (options.webAuthn) {
      composables.push({ name: 'useWebAuthn', from: resolver.resolve('./runtime/app/composables/webauthn') })
    }

    // App
    addComponentsDir({ path: resolver.resolve('./runtime/app/components') })
    addImports(composables)
    addPlugin(resolver.resolve('./runtime/app/plugins/session.server'))
    addPlugin(resolver.resolve('./runtime/app/plugins/session.client'))
    // Server
    addServerPlugin(resolver.resolve('./runtime/server/plugins/oauth'))
    addServerImportsDir(resolver.resolve('./runtime/server/lib/oauth'))
    if (nuxt.options.nitro?.experimental?.websocket) {
      addServerPlugin(resolver.resolve('./runtime/server/plugins/ws'))
    }
    // WebAuthn enabled
    if (options.webAuthn) {
      // Check if dependencies are installed
      const missingDeps: string[] = []
      const peerDeps = ['@simplewebauthn/server', '@simplewebauthn/browser']
      for (const pkg of peerDeps) {
        await import(pkg).catch(() => {
          missingDeps.push(pkg)
        })
      }
      if (missingDeps.length > 0) {
        logger.withTag('nuxt-auth-utils').error(`Missing dependencies for \`WebAuthn\`, please install with:\n\n\`npx nypm i ${missingDeps.join(' ')}\``)
        process.exit(1)
      }
      addServerImportsDir(resolver.resolve('./runtime/server/lib/webauthn'))
    }

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
    // Set node:crypto as unenv external
    nuxt.options.nitro.unenv ||= {}
    nuxt.options.nitro.unenv.external ||= []
    if (!nuxt.options.nitro.unenv.external.includes('node:crypto')) {
      nuxt.options.nitro.unenv.external.push('node:crypto')
    }

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
    }) as SessionConfig

    runtimeConfig.hash = defu(runtimeConfig.hash, {
      scrypt: options.hash?.scrypt,
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
    runtimeConfig.webauthn = defu(runtimeConfig.webauthn, {
      register: {},
      authenticate: {},
    })

    // Security settings
    runtimeConfig.nuxtAuthUtils = defu(runtimeConfig.nuxtAuthUtils, {})
    runtimeConfig.nuxtAuthUtils.security = defu(runtimeConfig.nuxtAuthUtils.security, {
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 15,
      },
    })

    // OAuth settings
    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    // Gitea OAuth
    runtimeConfig.oauth.gitea = defu(runtimeConfig.oauth.gitea, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
      baseURL: '',
    })
    // GitHub OAuth
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // GitLab OAuth
    runtimeConfig.oauth.gitlab = defu(runtimeConfig.oauth.gitlab, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
      baseURL: 'https://gitlab.com',
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
    // WorkOS OAuth
    runtimeConfig.oauth.workos = defu(runtimeConfig.oauth.workos, {
      clientId: '',
      clientSecret: '',
      connectionId: '',
      screenHint: '',
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
    // Azure OAuth
    runtimeConfig.oauth.azureb2c = defu(runtimeConfig.oauth.azureb2c, {
      clientId: '',
      policy: '',
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

    // Atproto OAuth
    for (const provider of atprotoProviders) {
      runtimeConfig.oauth[provider] = defu(runtimeConfig.oauth[provider], atprotoProviderDefaultClientMetadata)
    }

    if (options.atproto) {
      const missingDeps: string[] = []
      const peerDeps = ['@atproto/oauth-client-node', '@atproto/api']
      for (const pkg of peerDeps) {
        await import(pkg).catch(() => {
          missingDeps.push(pkg)
        })
      }

      if (missingDeps.length > 0) {
        logger.withTag('nuxt-auth-utils').error(`Missing dependencies for \`atproto\`, please install with:\n\n\`npx nypm i ${missingDeps.join(' ')}\``)
        process.exit(1)
      }

      for (const provider of atprotoProviders) {
        addServerHandler({
          handler: resolver.resolve('./runtime/server/routes/atproto/client-metadata.json.get'),
          route: '/' + getClientMetadataFilename(provider, runtimeConfig.oauth[provider] as AtprotoProviderClientMetadata),
          method: 'get',
        })
      }
      addServerImportsDir(resolver.resolve('./runtime/server/lib/atproto'))
    }

    // Keycloak OAuth
    runtimeConfig.oauth.keycloak = defu(runtimeConfig.oauth.keycloak, {
      clientId: '',
      clientSecret: '',
      serverUrl: '',
      serverUrlInternal: '',
      realm: '',
      redirectURL: '',
    })
    // Linear OAuth
    runtimeConfig.oauth.linear = defu(runtimeConfig.oauth.linear, {
      clientId: '',
      clientSecret: '',
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
    // Dropbox OAuth
    runtimeConfig.oauth.dropbox = defu(runtimeConfig.oauth.dropbox, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Polar OAuth
    runtimeConfig.oauth.polar = defu(runtimeConfig.oauth.polar, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Zitadel OAuth
    runtimeConfig.oauth.zitadel = defu(runtimeConfig.oauth.zitadel, {
      clientId: '',
      clientSecret: '',
      domain: '',
      redirectURL: '',
    })
    // Authentik OAuth
    runtimeConfig.oauth.authentik = defu(runtimeConfig.oauth.authentik, {
      clientId: '',
      clientSecret: '',
      domain: '',
      redirectURL: '',
    })
    // Seznam OAuth
    runtimeConfig.oauth.seznam = defu(runtimeConfig.oauth.seznam, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Strava OAuth
    runtimeConfig.oauth.strava = defu(runtimeConfig.oauth.strava, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Hubspot OAuth
    runtimeConfig.oauth.hubspot = defu(runtimeConfig.oauth.hubspot, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Line OAuth
    runtimeConfig.oauth.line = defu(runtimeConfig.oauth.line, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Atlassian OAuth
    runtimeConfig.oauth.atlassian = defu(runtimeConfig.oauth.atlassian, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // Apple OAuth
    runtimeConfig.oauth.apple = defu(runtimeConfig.oauth.apple, {
      teamId: '',
      keyId: '',
      privateKey: '',
      redirectURL: '',
      clientId: '',
    })
    // Kick OAuth
    runtimeConfig.oauth.kick = defu(runtimeConfig.oauth.kick, {
      clientId: '',
      clientSecret: '',
      redirectURL: '',
    })
    // LiveChat OAuth
    runtimeConfig.oauth.livechat = defu(runtimeConfig.oauth.livechat, {
      clientId: '',
      clientSecret: '',
    })
  },
})
