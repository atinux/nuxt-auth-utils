import { createError, defineEventHandler, deriveSecret } from 'nuxt/server'
import jwt from '@tsndr/cloudflare-worker-jwt'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.jwt?.accessToken) {
    throw createError({
      status: 401,
      message: 'Unauthorized',
    })
  }

  try {
    return await jwt.verify(session.jwt.accessToken, await deriveSecret('playground:jwt-access'), {
      throwError: true,
    })
  }
  catch (err) {
    throw createError({
      status: 401,
      message: (err as Error).message,
    })
  }
})
