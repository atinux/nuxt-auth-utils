import { randomUUID } from 'node:crypto'
import jwt from '@tsndr/cloudflare-worker-jwt'

export default defineEventHandler(async (event) => {
  // Get user from session
  const user = await getUserSession(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  if (!process.env.NUXT_SESSION_PASSWORD) {
    throw createError({
      statusCode: 500,
      message: 'Session secret not configured',
    })
  }

  // Generate tokens
  const accessToken = await jwt.sign(
    {
      hello: 'world',
      exp: Math.floor(Date.now() / 1000) + 5, // 30 seconds
    },
    process.env.NUXT_SESSION_PASSWORD,
  )

  const refreshToken = await jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    `${process.env.NUXT_SESSION_PASSWORD}-secret`,
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
