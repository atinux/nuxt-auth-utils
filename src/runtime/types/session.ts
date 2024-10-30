import type { ComputedRef, Ref } from 'vue'

export interface User {
}

export interface SecureSessionData {
}

export interface UserSession {
  /**
   * User session data, available on client and server
   */
  user?: User
  /**
   * Private session data, only available on server/ code
   */
  secure?: SecureSessionData
  /**
   * Timestamp of last access
   */
  lastAccess?: number
  /**
   * Extra session data, available on client and server
   */
  [key: string]: unknown
}

export interface UserSessionRequired extends UserSession {
  user: User
}

export interface UserSessionComposable {
  /**
   * Computed indicating if the auth session is ready
   */
  ready: ComputedRef<boolean>
  /**
   * Computed indicating if the user is logged in.
   */
  loggedIn: ComputedRef<boolean>
  /**
   * The user object if logged in, null otherwise.
   */
  user: ComputedRef<User | null>
  /**
   * The session object.
   */
  session: Ref<UserSession>
  /**
   * Fetch the user session from the server.
   */
  fetch: () => Promise<void>
  /**
   * Clear the user session and remove the session cookie.
   */
  clear: () => Promise<void>
}
