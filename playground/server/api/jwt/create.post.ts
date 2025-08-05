import { jws } from 'unjwt'

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

  // For demo purposes only, use high entropy secrets or keys in production
  const accessTokenKey = new TextEncoder().encode(process.env.NUXT_SESSION_PASSWORD)
  const refreshTokenKey = new TextEncoder().encode(`${process.env.NUXT_SESSION_PASSWORD}-secret`)

  // Generate tokens
  const accessToken = await jws.sign(
    {
      hello: 'world',
      exp: Math.floor(Date.now() / 1000) + 5, // 30 seconds
    },
    accessTokenKey,
    { alg: 'HS256' },
  )

  const refreshToken = await jws.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    refreshTokenKey,
    { alg: 'HS256' },
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
