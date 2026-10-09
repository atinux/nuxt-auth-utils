import { createError, defineEventHandler, deriveSecret } from 'nuxt/server'
import jwt from '@tsndr/cloudflare-worker-jwt'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.jwt?.accessToken && !session.jwt?.refreshToken) {
    throw createError({
      status: 401,
      message: 'Unauthorized',
    })
  }

  if (!await jwt.verify(session.jwt.refreshToken, await deriveSecret('playground:jwt-refresh'))) {
    throw createError({
      status: 401,
      message: 'refresh token is invalid',
    })
  }

  const accessToken = await jwt.sign(
    {
      hello: 'world',
      exp: Math.floor(Date.now() / 1000) + 30, // 30 seconds
    },
    await deriveSecret('playground:jwt-access'),
  )

  await setUserSession(event, {
    jwt: {
      accessToken,
      refreshToken: session.jwt.refreshToken,
    },
    loggedInAt: Date.now(),
  })

  return {
    accessToken,
    refreshToken: session.jwt.refreshToken,
  }
})
