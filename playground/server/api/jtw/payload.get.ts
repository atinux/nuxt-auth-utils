import jwt from '@tsndr/cloudflare-worker-jwt'

export default eventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.jwt?.accessToken) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  try {
    return await jwt.verify(session.jwt.accessToken, process.env.NUXT_SESSION_PASSWORD!, {
      throwError: true,
    })
  }
  catch (err) {
    throw createError({
      statusCode: 401,
      message: (err as Error).message,
    })
  }
})
