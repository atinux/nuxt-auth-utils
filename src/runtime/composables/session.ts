import { useState, computed, useRequestFetch } from '#imports'
import type { UserSession, UserSessionComposable } from '#auth-utils'

const useSessionState = () => useState<UserSession>('nuxt-session', () => ({}))

export function useUserSession(): UserSessionComposable {
  const sessionState = useSessionState()
  return {
    loggedIn: computed(() => Boolean(sessionState.value.user)),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    fetch,
    clear,
  }
}

async function fetch() {
  useSessionState().value = await useRequestFetch()('/api/_auth/session', {
    headers: {
      Accept: 'text/json',
    },
    retry: false,
  }).catch(() => ({}))
}

async function clear() {
  await $fetch('/api/_auth/session', { method: 'DELETE' })
  useSessionState().value = {}
}
