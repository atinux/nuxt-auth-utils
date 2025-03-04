import { appendResponseHeader } from 'h3'
import { useState, computed, useRequestFetch, useRequestEvent, useRouter } from '#imports'
import type { UserSession, UserSessionComposable, ClearSessionOptions } from '#auth-utils'

/**
 * Composable to get back the user session and utils around it.
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export function useUserSession(): UserSessionComposable {
  const serverEvent = import.meta.server ? useRequestEvent() : null
  const sessionState = useState<UserSession>('nuxt-session', () => ({}))
  const authReadyState = useState('nuxt-auth-ready', () => false)
  const router = useRouter()

  const clear = async (options?: ClearSessionOptions) => {
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
    if (options?.redirect) {
      router.push(options.redirect)
    }
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

  const popupListener = (e: StorageEvent) => {
    if (e.key === 'temp-nuxt-auth-utils-popup') {
      fetch()
      window.removeEventListener('storage', popupListener)
    }
  }
  const openInPopup = (route: string, size: { width?: number, height?: number } = {}) => {
    // Set a local storage item to tell the popup that we pending auth
    localStorage.setItem('temp-nuxt-auth-utils-popup', 'true')

    const width = size.width ?? 960
    const height = size.height ?? 600
    const top = (window.top?.outerHeight ?? 0) / 2
      + (window.top?.screenY ?? 0)
      - height / 2
    const left = (window.top?.outerWidth ?? 0) / 2
      + (window.top?.screenX ?? 0)
      - width / 2

    window.open(
      route,
      'nuxt-auth-utils-popup',
      `width=${width}, height=${height}, top=${top}, left=${left}, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no`,
    )

    window.addEventListener('storage', popupListener)
  }

  return {
    ready: computed(() => authReadyState.value),
    loggedIn: computed(() => Boolean(sessionState.value.user)),
    user: computed(() => sessionState.value.user || null),
    session: sessionState,
    fetch,
    openInPopup,
    clear,
  }
}
