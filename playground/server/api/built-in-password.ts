export default eventHandler(async (event) => {
  const { password } = await readBody(event)

  if (password !== '123456') {
    throw createError({
      statusCode: 401,
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
