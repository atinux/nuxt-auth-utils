import type { H3Event, H3Error } from 'h3'
import type { OAuthTokens, OAuthUser } from '#auth-utils'

export interface OAuthConfig<TConfig, TUser = Record<string, unknown>> {
  config?: TConfig
  onSuccess: (
    event: H3Event,
    result: { user: OAuthUser<TUser>, tokens: OAuthTokens }
  ) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}
