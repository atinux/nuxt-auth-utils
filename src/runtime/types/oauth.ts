export interface OAuthUser<RawUser = Record<string, unknown>> {
  /**
   * Unique identifier for the user
   */
  id: string | number
  /**
   * The user's username
   */
  nickname: string
  /**
   * The user's full name
   */
  name: string
  /**
   * The user's email address
   */
  email: string
  /**
   * The user's profile picture URL
   */
  avatar: string

  /**
   * The raw user object from the provider
   */
  raw: RawUser
}

export interface OAuthTokens {
  /**
   * The access token to use for API requests
   */
  token: string
  /**
   * The refresh token to use to get a new access token
   */
  refreshToken: string
  /**
   * The token type
   */
  expiresIn: number
  /**
   * The scope of the access token
   */
  approvedScopes: string[]
}
