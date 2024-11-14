import { appendResponseHeader } from 'h3'
import { useState, computed, useRequestFetch, useRequestEvent } from '#imports'
import type { UserSession, UserSessionComposable } from '#auth-utils'

/**
 * Composable to get back the user session and utils around it.
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export function useUserSession(): UserSessionComposable {
  const serverEvent = import.meta.server ? useRequestEvent() : null
  const sessionState = useState<UserSession>('nuxt-session', () => ({}))
  const authReadyState = useState('nuxt-auth-ready', () => false)

  const clear = async () => {
    await useRequestFetch()('/api/_auth/session', {
      method: 'DELETE',
      onResponse({ response: { headers } }) {
        // Forward the Set-Cookie header to the main server event
        if (import.meta.server && serverEvent) {
          for (const setCookie of headers.getSetCookie()) {
            appendResponseHeader(serverEvent, 'Set-Cookie', setCookie)
          }
        }
      },
    })
    sessionState.value = {}
  }

  const fetch = async () => {
    sessionState.value = await useRequestFetch()('/api/_auth/session', {
      headers: {
        accept: 'application/json',
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
