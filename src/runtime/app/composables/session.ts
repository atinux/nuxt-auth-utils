import { useState, computed, useRequestFetch } from '#imports'
import type { UserSession, UserSessionComposable } from '#auth-utils'

/**
 * Composable to get back the user session and utils around it.
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export function useUserSession(): UserSessionComposable {
  const sessionState = useState<UserSession>('nuxt-session', () => ({}))
  const authReadyState = useState('nuxt-auth-ready', () => false)

  const clear = async () => {
    await $fetch('/api/_auth/session', { method: 'DELETE' })
    sessionState.value = {}
  }

  const fetch = async () => {
    sessionState.value = await useRequestFetch()('/api/_auth/session', {
      headers: {
        Accept: 'text/json',
      },
      retry: false,
    }).catch(() => ({}))
    if (!authReadyState.value) {
      authReadyState.value = true
    }
  }

  return {
    ready: computed(() => authReadyState.value),
    loggedIn: computed(() => Boolean(sessionState.value.user)),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    fetch,
    clear,
  }
}
