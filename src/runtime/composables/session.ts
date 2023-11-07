import { useState, computed, useRequestFetch } from '#imports'
import type { default as UserSessionFactory } from '#auth-utils-session'
type UserSession = ReturnType<typeof UserSessionFactory>

const useSessionState = () => useState<UserSession | Record<string, unknown>>('nuxt-session', () => ({}))

export const useUserSession = () => {
  const sessionState = useSessionState()
  return {
    loggedIn: computed(() => Boolean(sessionState.value.user)),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    fetch,
    clear
  }
}

async function fetch() {
  useSessionState().value = await useRequestFetch()('/api/_auth/session').catch(() => ({}))
}

async function clear() {
  await $fetch('/api/_auth/session', { method: 'DELETE' })
  useSessionState().value = {}
}
