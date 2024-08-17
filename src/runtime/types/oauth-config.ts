import type { H3Event, H3Error } from 'h3'
import type { OAuthToken, OAuthUser } from '#auth-utils'

export interface OAuthConfig<TConfig, TUser = Record<string, unknown>> {
  config?: TConfig
  onSuccess: (
    event: H3Event,
    result: { user: OAuthUser<TUser>, tokens: OAuthToken }
  ) => Promise<void> | void
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void
}
