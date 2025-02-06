import { defineEventHandler, createError } from 'h3'
import { getAtprotoClientMetadata } from '../../utils/atproto'
import { atprotoProviders, getClientMetadataFilename } from '../../../utils/atproto'
import type { AtprotoProviderClientMetadata } from '../../../types/atproto'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler((event) => {
  const path = event.path.slice(1)
  const runtimeConfig = useRuntimeConfig(event)

  for (const provider of atprotoProviders) {
    const config = runtimeConfig.oauth[provider] as AtprotoProviderClientMetadata

    if (getClientMetadataFilename(provider, config) === path) {
      return getAtprotoClientMetadata(event, provider)
    }
  }

  throw createError({
    statusCode: 404,
    message: 'Provider not found',
  })
})
