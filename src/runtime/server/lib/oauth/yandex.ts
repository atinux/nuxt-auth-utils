import type { H3Event } from 'h3'
import {
  eventHandler,
  createError,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { withQuery, parsePath } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthYandexConfig {
  /**
   * Yandex OAuth Client ID
   * @default process.env.NUXT_OAUTH_YANDEX_CLIENT_ID
   */
  clientId?: string

  /**
   * Yandex OAuth Client Secret
   * @default process.env.NUXT_OAUTH_YANDEX_CLIENT_SECRET
   */
  clientSecret?: string

  /**
   * Yandex OAuth Scope
   * @default []
   * @see https://yandex.ru/dev/id/doc/en/codes/code-url#optional
   * @example ["login:avatar", "login:birthday", "login:email", "login:info", "login:default_phone"]
   */
  scope?: string[]

  /**
   * Yandex OAuth Authorization URL
   * @default 'https://oauth.yandex.ru/authorize'
   */
  authorizationURL?: string

  /**
   * Yandex OAuth Token URL
   * @default 'https://oauth.yandex.ru/token'
   */
  tokenURL?: string

  /**
   * Yandex OAuth User URL
   * @default 'https://login.yandex.ru/info'
   */
  userURL?: string
}

export function yandexEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthYandexConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.yandex, {
      authorizationURL: 'https://oauth.yandex.ru/authorize',
      tokenURL: 'https://oauth.yandex.ru/token',
      userURL: 'https://login.yandex.ru/info',
    }) as OAuthYandexConfig

    const { code } = getQuery(event)

    if (!config.clientId || !config.clientSecret) {
      const error = createError({
        statusCode: 500,
        message:
          'Missing NUXT_OAUTH_YANDEX_CLIENT_ID or NUXT_OAUTH_YANDEX_CLIENT_SECRET env variables.',
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const redirectUrl = getRequestURL(event).href

    if (!code) {
      config.scope = config.scope || [
        'login:avatar',
        'login:email',
        'login:info',
      ]
      // Redirect to Yandex Oauth page
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectUrl,
          scope: config.scope.join(' '),
        }),
      )
    }

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData: any = new FormData()
    formData.append('grant_type', 'authorization_code')
    formData.append('client_id', config.clientId)
    formData.append('client_secret', config.clientSecret)
    formData.append('redirect_uri', parsePath(redirectUrl).pathname)
    formData.append('code', code)

    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokens: any = await $fetch(config.tokenURL as string, {
      method: 'POST',
      body: formData,
    }).catch((error) => {
      return { error }
    })
    if (tokens.error) {
      const error = createError({
        statusCode: 401,
        message: `Yandex login failed: ${
          tokens.error?.data?.error_description || 'Unknown error'
        }`,
        data: tokens,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const accessToken = tokens.access_token
    // TODO: improve typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await $fetch(config.userURL as string, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    })

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
