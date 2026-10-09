import { createError, defineEventHandler, getRequestURL, useRuntimeConfig } from 'nuxt/server'
import { withoutBase } from 'ufo'
import { getAtprotoClientMetadata } from '../../utils/atproto'
import { atprotoProviders, getClientMetadataFilename } from '../../../utils/atproto'
import type { AtprotoProviderClientMetadata } from '../../../types/atproto'

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig()
  const path = withoutBase(getRequestURL(event).pathname, runtimeConfig.app.baseURL).slice(1)

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
