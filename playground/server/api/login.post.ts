import { HashedPassword } from "#auth-utils"

interface DBUser {
  id: number
  email: string
  password: HashedPassword
}

export default defineLazyEventHandler(async () => {
  const db = useDatabase()

  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT UNIQUE NOT NULL, "password" TEXT NOT NULL)`

  const invalidCredentialsError = createError({
    statusCode: 401,
    // This message is intentionally vague to prevent user enumeration attacks.
    message: 'Invalid credentials',
  })

  return defineEventHandler(async (event) => {
    const body = await readBody(event)

    const email = body.email

    const user = await db.sql<{ rows: DBUser[] }>`SELECT * FROM users WHERE email = ${email}`.then((result) => result.rows[0])

    if (!user) {
      throw invalidCredentialsError
    }

    if(!comparePassword(user.password, body.password)) {
      throw invalidCredentialsError
    }

    await setUserSession(event, {
      user: {
        email,
      },
      loggedInAt: Date.now(),
    })

    return setResponseStatus(event, 201)
  })
})
