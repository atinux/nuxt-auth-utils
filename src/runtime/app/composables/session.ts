import { useState, computed, useRequestFetch } from '#imports'
import type { UserSession, UserSessionComposable } from '#auth-utils'

const useSessionState = () => useState<UserSession>('nuxt-session', () => ({}))
const useAuthReadyState = () => useState('nuxt-auth-ready', () => false)

/**
 * Composable to get back the user session and utils around it.
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export function useUserSession(): UserSessionComposable {
  const sessionState = useSessionState()
  const authReadyState = useAuthReadyState()
  return {
    ready: computed(() => authReadyState.value),
    loggedIn: computed(() => Boolean(sessionState.value.user)),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    fetch,
    clear,
  }
}

async function fetch() {
  const authReadyState = useAuthReadyState()
  useSessionState().value = await useRequestFetch()('/api/_auth/session', {
    headers: {
      Accept: 'text/json',
    },
    retry: false,
  }).catch(() => ({}))
  if (!authReadyState.value) {
    authReadyState.value = true
  }
}

async function clear() {
  await $fetch('/api/_auth/session', { method: 'DELETE' })
  useSessionState().value = {}
}
