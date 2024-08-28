export interface OAuthUser<RawUser = Record<string, unknown>> {
  /**
   * Unique identifier for the user
   */
  id: string | number
  /**
   * The user's username
   */
  nickname?: string
  /**
   * The user's full name
   */
  name?: string
  /**
   * The user's email address
   */
  email?: string
  /**
   * The user's profile picture URL
   */
  avatar?: string

  /**
   * The raw user object from the provider
   */
  raw: RawUser
}

export interface OAuthToken {
  /**
   * The access token to use for API requests
   */
  token?: string
  /**
   * The refresh token to use to get a new access token
   */
  refreshToken?: string
  /**
   * The token type
   */
  expiresIn?: number
  /**
   * The scope of the access token
   */
  approvedScopes?: string[]
}

/**
 * The successful response from the OAuth provider when exchanging a code for an access token.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
 */
export interface OAuthAccessTokenSuccess {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

/**
 * The error response from the OAuth provider when exchanging a code for an access token.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export interface OAuthAccessTokenError {
  error: string
  error_description?: string
  error_uri?: string
}
