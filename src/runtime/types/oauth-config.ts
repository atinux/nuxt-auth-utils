import type { H3Event, H3Error } from 'h3'
import type { UserSession } from '#auth-utils'

export interface OAuthConfig<TConfig, TUser = UserSession, TTokens = any> {
  config?: TConfig;
  onSuccess: (
    event: H3Event,
    result: { user: TUser; tokens: TTokens }
  ) => Promise<void> | void;
  onError?: (event: H3Event, error: H3Error) => Promise<void> | void;
}
