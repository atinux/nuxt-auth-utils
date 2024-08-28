import type { H3Event } from 'h3'
import { snakeCase } from 'scule'
import type { OnError, Provider } from '#auth-utils'
import { createError } from '#imports'

export function handleMissingConfiguration(event: H3Event, provider: Provider, missingKeys: string[], onError?: OnError) {
  const environmentVariables = missingKeys.map(key => `NUXT_OAUTH_${provider.toUpperCase()}_${snakeCase(key).toUpperCase()}`)

  const error = createError({
    statusCode: 500,
    message: `Missing ${environmentVariables.join(' or ')} env ${missingKeys.length > 1 ? 'variables' : 'variable'}.`,
  })

  if (!onError) throw error
  return onError(event, error)
}
