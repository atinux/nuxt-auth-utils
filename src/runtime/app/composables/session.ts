import type { NuxtApp } from 'nuxt/app'
import { useState, computed, createError, useNuxtApp, useRequestFetch, useRequestEvent } from '#imports'
import type { UserSessionComposable } from '#auth-utils'

// The latest session request of each Nuxt app, shared by all `useUserSession()` calls
const latestFetch = new WeakMap<NuxtApp, Promise<unknown>>()
// Nuxt apps that cleared the session during SSR: the request cookie still holds the cleared session
const clearedDuringSSR = new WeakSet<NuxtApp>()

/**
 * Composable to get back the user session and utils around it.
 * @see https://github.com/atinux/nuxt-auth-utils
 */
export function useUserSession(): UserSessionComposable {
  const serverEvent = import.meta.server ? useRequestEvent() : null
  const sessionState = useState<UserSessionComposable['session']['value']>('nuxt-session', () => null)
  const authReadyState = useState('nuxt-auth-ready', () => false)
  const errorState = useState<UserSessionComposable['error']['value']>('nuxt-auth-error', () => null)
  const statusState = useState<UserSessionComposable['status']['value']>('nuxt-auth-status', () => 'idle')
  const requestFetch = useRequestFetch()
  const nuxtApp = useNuxtApp()

  // Forward the Set-Cookie header to the main server event, so the browser stores the session written during SSR
  const onResponse = ({ response: { headers } }: { response: { headers: Headers } }) => {
    if (import.meta.server && serverEvent) {
      // Nitro 3 events have web response headers, Nitro 2 (h3 v1) events the Node.js response
      const res = serverEvent.res as { headers?: Headers, appendHeader?: (name: string, value: string) => void }
      for (const setCookie of headers.getSetCookie()) {
        if (res.headers) res.headers.append('set-cookie', setCookie)
        else res.appendHeader?.('set-cookie', setCookie)
      }
    }
  }

  const clear = async () => {
    await requestFetch('/api/_auth/session', {
      method: 'DELETE',
      onResponse(context) {
        // Cancel the fetch in flight once the session is cleared, before the logout cookie: it cannot restore the session or send its cookie after it
        if (context.response.ok) {
          latestFetch.delete(nuxtApp)
          if (import.meta.server) clearedDuringSSR.add(nuxtApp)
        }
        onResponse(context)
      },
    })
    sessionState.value = null
    errorState.value = null
    statusState.value = 'idle'
    // The cancelled fetch may be the first one, which would set it
    authReadyState.value = true
  }

  const fetch = async () => {
    // Fetching would read the cleared session from the request cookie again, and could send a new cookie for it
    if (import.meta.server && clearedDuringSSR.has(nuxtApp)) return
    statusState.value = 'pending'
    const request = requestFetch<NonNullable<UserSessionComposable['session']['value']>>('/api/_auth/session', {
      headers: {
        accept: 'application/json',
      },
      retry: false,
      onResponse(context) {
        // Like the session state, only the latest fetch sets the cookie: `clear()` or a newer fetch may have answered first
        if (latestFetch.get(nuxtApp) === request) onResponse(context)
      },
    })
    latestFetch.set(nuxtApp, request)
    try {
      const session = await request
      // A newer fetch started meanwhile: let it set the state
      if (latestFetch.get(nuxtApp) !== request) return
      sessionState.value = session
      errorState.value = null
      statusState.value = 'success'
    }
    catch (error) {
      if (latestFetch.get(nuxtApp) !== request) return
      // Keep the current session: a failed request does not mean the user logged out
      // `createError` returns a NuxtError, which the payload can send from the server to the client
      errorState.value = createError(error as Error)
      statusState.value = 'error'
    }
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
    try {
      // Set a local storage item to tell the popup that we pending auth
      localStorage.setItem('temp-nuxt-auth-utils-popup', 'true')
    }
    catch (error) {
      console.error('[nuxt-auth-utils] Could not use localStorage during popup flow initialization.', error)
    }

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
    loggedIn: computed(() => Boolean(sessionState.value?.user)),
    user: computed(() => sessionState.value?.user || null),
    session: sessionState,
    status: computed(() => statusState.value),
    error: computed(() => errorState.value),
    fetch,
    openInPopup,
    clear,
  }
}
