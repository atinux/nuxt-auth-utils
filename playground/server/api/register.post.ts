export default defineLazyEventHandler(async () => {
  const db = useDatabase()

  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT UNIQUE NOT NULL, "password" TEXT NOT NULL)`

  return defineEventHandler(async (event) => {
    const runtimeConfig = useRuntimeConfig(event)

    const body = await readBody(event)

    const email = body.email
    const password = hashPassword(body.password, { rounds: runtimeConfig.passwordHashRounds })

    await db.sql`INSERT INTO users(email, password) VALUES (${email}, ${password})`

    // In real applications, you should send a confirmation email to the user before logging them in.

    await setUserSession(event, {
      user: {
        email,
      },
      loggedInAt: Date.now(),
    })

    return setResponseStatus(event, 201)
  })
})
