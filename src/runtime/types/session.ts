import type { ComputedRef, Ref } from 'vue'

export interface UserSessionUserData {}

export interface ResolvedUserSession {
  user: UserSessionUserData | null
}

export interface UserSession {
  user?: UserSessionUserData
}

// explicitly type
export interface UserSessionApi {
  loggedIn: ComputedRef<boolean>
  user: ComputedRef<UserSessionUserData | null>
  session: Ref<UserSession>,
  fetch: () => Promise<void>,
  clear: () => Promise<void>
}
