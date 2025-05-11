import { verify } from 'unjwt/jws'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.jwt?.accessToken) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // For demo purposes only, use a high entropy secret or key in production
  const accessTokenKey = new TextEncoder().encode(process.env.NUXT_SESSION_PASSWORD)

  try {
    return await verify(session.jwt.accessToken, accessTokenKey)
  }
  catch (err) {
    throw createError({
      statusCode: 401,
      message: (err as Error).message,
    })
  }
})
