import { createError, defineEventHandler, deriveSecret } from 'nuxt/server'
import jwt from '@tsndr/cloudflare-worker-jwt'

export default defineEventHandler(async (event) => {
  // Get user from session
  const user = await getUserSession(event)
  if (!user) {
    throw createError({
      status: 401,
      message: 'Unauthorized',
    })
  }

  // Secrets derived from `appSecret` (`NUXT_APP_SECRET`)
  const accessSecret = await deriveSecret('playground:jwt-access')
  const refreshSecret = await deriveSecret('playground:jwt-refresh')

  // Generate tokens
  const accessToken = await jwt.sign(
    {
      hello: 'world',
      exp: Math.floor(Date.now() / 1000) + 5, // 30 seconds
    },
    accessSecret,
  )

  const refreshToken = await jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    refreshSecret,
  )

  await setUserSession(event, {
    jwt: {
      accessToken,
      refreshToken,
    },
    loggedInAt: Date.now(),
  })

  // Return tokens
  return {
    accessToken,
    refreshToken,
  }
})
