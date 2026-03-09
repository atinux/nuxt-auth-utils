import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  getOAuthRedirectURL,
  handleInvalidState,
  handleMissingConfiguration,
  handleState,
} from '../utils'
import { createError, useRuntimeConfig } from '#imports'
import type { OAuthConfig } from '#auth-utils'

export interface OAuthWechatConfig {
  /**
   * WeChat App ID
   * @default process.env.NUXT_OAUTH_WECHAT_APP_ID
   */
  appId?: string

  /**
   * WeChat App Secret
   * @default process.env.NUXT_OAUTH_WECHAT_APP_SECRET
   */
  appSecret?: string

  /**
   * WeChat OAuth Scope
   * @default ['snsapi_login']
   * @see https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
   */
  scope?: string[]

  /**
   * Authorization URL
   * @default 'https://open.weixin.qq.com/connect/qrconnect'
   */
  authorizationURL?: string

  /**
   * Access token URL
   * @default 'https://api.weixin.qq.com/sns/oauth2/access_token'
   */
  tokenURL?: string

  /**
   * User profile URL
   * @default 'https://api.weixin.qq.com/sns/userinfo'
   */
  userURL?: string

  /**
   * User info language.
   * @default 'zh_CN'
   */
  lang?: 'zh_CN' | 'zh_TW' | 'en'

  /**
   * Redirect URL to allow overriding when public hostname cannot be inferred.
   * @default process.env.NUXT_OAUTH_WECHAT_REDIRECT_URL or current URL
   */
  redirectURL?: string
}

interface WechatOAuthError {
  errcode: number
  errmsg: string
}

export interface WechatOAuthTokens {
  access_token: string
  expires_in: number
  refresh_token: string
  openid: string
  scope: string
  unionid?: string
}

export interface WechatOAuthUser {
  openid: string
  nickname: string
  sex: 0 | 1 | 2
  province: string
  city: string
  country: string
  headimgurl: string
  privilege: string[]
  unionid?: string
}

function isWechatOAuthError(value: unknown): value is WechatOAuthError {
  return Boolean(
    value
    && typeof value === 'object'
    && 'errcode' in value
    && 'errmsg' in value,
  )
}

function handleWechatOAuthError(event: H3Event, phase: 'token' | 'userinfo', oauthError: WechatOAuthError, onError?: OAuthConfig<OAuthWechatConfig>['onError']) {
  const error = createError({
    statusCode: 401,
    message: `WeChat ${phase} request failed: ${oauthError.errmsg} (${oauthError.errcode})`,
    data: oauthError,
  })

  if (!onError) throw error
  return onError(event, error)
}

export function defineOAuthWechatEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthWechatConfig, { user: WechatOAuthUser, tokens: WechatOAuthTokens }>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, useRuntimeConfig(event).oauth?.wechat, {
      authorizationURL: 'https://open.weixin.qq.com/connect/qrconnect',
      tokenURL: 'https://api.weixin.qq.com/sns/oauth2/access_token',
      userURL: 'https://api.weixin.qq.com/sns/userinfo',
      lang: 'zh_CN',
    }) as OAuthWechatConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `WeChat login failed: ${query.error || 'Unknown error'}`,
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    if (!config.appId || !config.appSecret) {
      return handleMissingConfiguration(event, 'wechat', ['appId', 'appSecret'], onError)
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event)
    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope || ['snsapi_login']
      return sendRedirect(
        event,
        `${withQuery(config.authorizationURL as string, {
          appid: config.appId,
          redirect_uri: redirectURL,
          response_type: 'code',
          scope: config.scope.join(','),
          state,
        })}#wechat_redirect`,
      )
    }

    if (query.state !== state) {
      return handleInvalidState(event, 'wechat', onError)
    }

    const tokens = await $fetch<WechatOAuthTokens | WechatOAuthError>(config.tokenURL as string, {
      query: {
        appid: config.appId,
        secret: config.appSecret,
        code: query.code,
        grant_type: 'authorization_code',
      },
    })

    if (isWechatOAuthError(tokens)) {
      return handleWechatOAuthError(event, 'token', tokens, onError)
    }

    const user = await $fetch<WechatOAuthUser | WechatOAuthError>(config.userURL as string, {
      query: {
        access_token: tokens.access_token,
        openid: tokens.openid,
        lang: config.lang,
      },
    })

    if (isWechatOAuthError(user)) {
      return handleWechatOAuthError(event, 'userinfo', user, onError)
    }

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
