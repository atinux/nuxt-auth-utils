import { createError, defineEventHandler, getRequestURL, useRuntimeConfig } from 'nuxt/server'
import { getAtprotoClientMetadata } from '../../utils/atproto'
import { atprotoProviders, getClientMetadataFilename } from '../../../utils/atproto'
import type { AtprotoProviderClientMetadata } from '../../../types/atproto'

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname.slice(1)
  const runtimeConfig = useRuntimeConfig()

  for (const provider of atprotoProviders) {
    const config = runtimeConfig.oauth[provider] as AtprotoProviderClientMetadata

    if (getClientMetadataFilename(provider, config) === path) {
      return getAtprotoClientMetadata(event, provider)
    }
  }

  throw createError({
    status: 404,
    message: 'Provider not found',
  })
})
