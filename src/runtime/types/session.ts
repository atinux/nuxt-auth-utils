import type { ComputedRef, Ref } from 'vue'

export interface User {
}

export interface UserSession {
  user?: User
}

export interface UserSessionApi {
  loggedIn: ComputedRef<boolean>
  user: ComputedRef<User | null>
  session: Ref<UserSession>,
  fetch: () => Promise<void>,
  clear: () => Promise<void>
}