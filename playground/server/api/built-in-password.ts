import { createError, defineEventHandler, readBody } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password?: string }>(event)

  if (password !== '123456') {
    throw createError({
      status: 401,
      message: 'Wrong password',
    })
  }
  await setUserSession(event, {
    user: {
      password: 'admin',
    },
    loggedInAt: Date.now(),
  })

  return {}
})
