import type { RequestEvent } from 'nuxt/server'
import { defineEventHandler, createError, getQuery, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { $fetch } from 'ofetch'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import {
  getOAuthRedirectURL,
  handleInvalidState,
  handleMissingConfiguration,
  handleState,
} from '../utils'
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

function handleWechatOAuthError(event: RequestEvent, phase: 'token' | 'userinfo', oauthError: WechatOAuthError, onError?: OAuthConfig<OAuthWechatConfig>['onError']) {
  const error = createError({
    status: 401,
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
  return defineEventHandler(async (event: RequestEvent) => {
    config = defu(config, useRuntimeConfig().oauth?.wechat, {
      authorizationURL: 'https://open.weixin.qq.com/connect/qrconnect',
      tokenURL: 'https://api.weixin.qq.com/sns/oauth2/access_token',
      userURL: 'https://api.weixin.qq.com/sns/userinfo',
      lang: 'zh_CN',
    }) as OAuthWechatConfig

    const query = getQuery<{ code?: string, state?: string, error?: string }>(event)

    if (query.error) {
      const error = createError({
        status: 401,
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

    // WeChat redirects back with only `state` when the user denies authorization
    if (!query.code && query.state) {
      await handleState(event, { isCallback: true })
      const error = createError({
        status: 401,
        message: 'WeChat login failed: authorization denied',
        data: query,
      })
      if (!onError) throw error
      return onError(event, error)
    }

    const state = await handleState(event)

    if (!query.code) {
      config.scope = config.scope?.length ? config.scope : ['snsapi_login']
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

    if (!state || query.state !== state) {
      return handleInvalidState(event, 'wechat', onError)
    }

    // The request URLs carry the app secret and access token, so don't let a fetch error (and its URL) reach the logs
    const tokens = await $fetch<WechatOAuthTokens | WechatOAuthError>(config.tokenURL as string, {
      // WeChat answers JSON with a text/plain content type
      responseType: 'json',
      query: {
        appid: config.appId,
        secret: config.appSecret,
        code: query.code,
        grant_type: 'authorization_code',
      },
    }).catch((error): WechatOAuthError => ({ errcode: error?.response?.status ?? -1, errmsg: 'token request failed' }))

    if (isWechatOAuthError(tokens)) {
      return handleWechatOAuthError(event, 'token', tokens, onError)
    }

    const user = await $fetch<WechatOAuthUser | WechatOAuthError>(config.userURL as string, {
      responseType: 'json',
      query: {
        access_token: tokens.access_token,
        openid: tokens.openid,
        lang: config.lang,
      },
    }).catch((error): WechatOAuthError => ({ errcode: error?.response?.status ?? -1, errmsg: 'userinfo request failed' }))

    if (isWechatOAuthError(user)) {
      return handleWechatOAuthError(event, 'userinfo', user, onError)
    }

    return onSuccess(event, {
      tokens,
      user,
    })
  })
}
