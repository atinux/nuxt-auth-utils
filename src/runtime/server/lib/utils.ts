import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import { FetchError } from 'ofetch'
import { snakeCase } from 'scule'
import type { OnError, Provider } from '#auth-utils'
import { createError } from '#imports'

export function getOAuthRedirectURL(event: H3Event): string {
  const requestURL = getRequestURL(event)

  return `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`
}

/**
 * Request an access token body.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
interface RequestAccessTokenBody {
  grant_type: 'authorization_code'
  code: string
  redirect_uri: string
  client_id: string
  client_secret?: string
}

interface RequestAccessTokenOptions {
  body?: RequestAccessTokenBody
  params?: Record<string, string>
  headers?: Record<string, string>
}

/**
 * Request an access token from the OAuth provider.
 *
 * When an error occurs, only the error data is returned.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
// TODO: waiting for https://github.com/atinux/nuxt-auth-utils/pull/140
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requestAccessToken(url: string, options: RequestAccessTokenOptions): Promise<any> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...options.headers,
  }

  // Encode the body as a URLSearchParams if the content type is 'application/x-www-form-urlencoded'.
  const body = headers['Content-Type'] === 'application/x-www-form-urlencoded'
    ? new URLSearchParams(options.body as unknown as Record<string, string> || options.params || {},
    ).toString()
    : options.body

  return $fetch(url, {
    method: 'POST',
    headers,
    body,
  }).catch((error) => {
    /**
     * For a better error handling, only unauthorized errors are intercepted, and other errors are re-thrown.
     */
    if (error instanceof FetchError && error.status === 401) {
      return error.data
    }

    console.log(error.data)
    throw error
  })
}

export function handleMissingConfiguration(event: H3Event, provider: Provider, missingKeys: string[], onError?: OnError) {
  const environmentVariables = missingKeys.map(key => `NUXT_OAUTH_${provider.toUpperCase()}_${snakeCase(key).toUpperCase()}`)

  const error = createError({
    statusCode: 500,
    message: `Missing ${environmentVariables.join(' or ')} env ${missingKeys.length > 1 ? 'variables' : 'variable'}.`,
  })

  if (!onError) throw error
  return onError(event, error)
}
