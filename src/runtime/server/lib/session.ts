import type { SessionConfig } from 'nuxt/server'
import { useRuntimeConfig } from 'nuxt/server'
import { defu } from 'defu'

/**
 * Name of the cookie the user session is sealed into.
 */
export const USER_SESSION_COOKIE_NAME = 'nuxt-auth-session'

const APP_SESSION_COOKIE_NAME = 'nuxt-session'

/**
 * The session config of the user session: the runtime config merged under `config`, without `password`.
 */
export function resolveSessionConfig(config: Omit<SessionConfig, 'password'> = {}): SessionConfig & { name: string } {
  const runtimeConfig = useRuntimeConfig()
  warnLegacySessionPassword(runtimeConfig)

  // The session is sealed with a secret derived from `appSecret` (`NUXT_APP_SECRET`)
  const { password: _password, ...finalConfig } = defu(config, runtimeConfig.session, { name: USER_SESSION_COOKIE_NAME }) as SessionConfig & { name: string }
  // `nuxt-session` is the cookie of the app's own `useSession()`: sharing it would mix both sessions
  if (finalConfig.name === APP_SESSION_COOKIE_NAME) {
    warnAppSessionName()
    finalConfig.name = USER_SESSION_COOKIE_NAME
  }

  return finalConfig
}

let warnedAppSessionName = false

function warnAppSessionName() {
  if (warnedAppSessionName) return
  warnedAppSessionName = true
  console.warn(`[nuxt-auth-utils] The session name \`${APP_SESSION_COOKIE_NAME}\` is the cookie of \`useSession()\` from \`nuxt/server\`, using \`${USER_SESSION_COOKIE_NAME}\` instead. Set another \`runtimeConfig.session.name\` (\`NUXT_SESSION_NAME\`) to rename the user session cookie.`)
}

let checkedLegacySessionPassword = false

function warnLegacySessionPassword(runtimeConfig: ReturnType<typeof useRuntimeConfig>) {
  if (checkedLegacySessionPassword) return
  checkedLegacySessionPassword = true

  const envPrefix = (runtimeConfig as { nitro?: { envPrefix?: string } }).nitro?.envPrefix || 'NUXT_'
  const envKey = `${envPrefix}SESSION_PASSWORD`
  if (globalThis.process?.env?.[envKey] || (runtimeConfig.session as SessionConfig | undefined)?.password) {
    console.warn(`[nuxt-auth-utils] \`${envKey}\` (\`runtimeConfig.session.password\`) is not used anymore. Set \`NUXT_APP_SECRET\` instead, for example with \`openssl rand -base64 32\`. Sessions are now sealed with a secret derived from \`appSecret\`.`)
  }
}
