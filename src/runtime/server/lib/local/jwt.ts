import type { H3Event, H3Error } from 'h3'
import { createError, eventHandler } from 'h3'
import { ofetch } from 'ofetch'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'

export interface JWTConfig {
  /**
   * GitHub OAuth Client ID
   * @default process.env.NUXT_LOCAL_JWT_LOGIN_URL
   */
  loginURL?: string

  /**
   * GitHub OAuth Client ID
   * @default process.env.NUXT_LOCAL_JWT_USER_URL
   */
  userURL?: string
}

interface JWTAuthConfig {
  config?: JWTConfig
  onSuccess: (event: H3Event, result: { user: any, tokens: any }) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}

export function jwtEventHandler ({ config, onSuccess, onError }: JWTAuthConfig) {
  return eventHandler(async (event: H3Event) => {
    // @ts-ignore
    config = defu(config, useRuntimeConfig(event).local?.jwt) as JWTConfig
    console.log(config)
    if (!config.loginURL || !config.userURL) {
      const error = createError({
        statusCode: 500,
        message: 'Missing NUXT_LOCAL_JWT_LOGIN_URL or NUXT_LOCAL_JWT_USER_URL env variables.'
      })
      if (!onError) throw error
      return onError(event, error)
    }
    const body = await readBody(event)


    const tokens: any = await ofetch(config.loginURL, {
      method: 'POST',
      body
    })

    const user: any = await ofetch(
      config.userURL,
      {
        headers: {
          Authorization: `Bearer ${tokens.token}`,
        },
      }
    )


    return onSuccess(event, {
      user,
      tokens
    })
  })
}
