import { defineEventHandler, createError } from 'h3'
import { getAtprotoClientMetadata } from '../../utils/atproto'
import { useRuntimeConfig } from '#imports'
import { atprotoProviders } from '~/src/utils/atproto'
import type { AtprotoProviderClientMetadata } from '~/src/runtime/types/atproto'

export default defineEventHandler((event) => {
  const path = event.path.slice(1)
  const runtimeConfig = useRuntimeConfig(event)

  for (const provider of atprotoProviders) {
    const config: AtprotoProviderClientMetadata = runtimeConfig.oauth[provider]

    if (config.clientMetadataFilename === path) {
      return getAtprotoClientMetadata(event, provider)
    }
  }

  throw createError({
    statusCode: 404,
    message: 'Provider not found',
  })
})
