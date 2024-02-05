import { useState, computed, useRequestFetch, useRuntimeConfig } from '#imports'
import type { UserSession } from '#auth-utils'

const useSessionState = () => useState<UserSession>('nuxt-session', () => ({}))

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
  const {auth: config } = useRuntimeConfig()
  useSessionState().value = await useRequestFetch()(config.serverHandler.getSession.route, {
    headers: {
      Accept: 'text/json'
    },
    methods: config.serverHandler.getSession.method,
  }).catch(() => ({}))
}

async function clear() {
  const {auth: config } = useRuntimeConfig()
  await $fetch(config.serverHandler.deleteSession.route, { method: config.serverHandler.deleteSession.method })
  useSessionState().value = {}
}
