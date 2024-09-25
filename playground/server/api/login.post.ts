import { z } from 'zod'

interface DBUser {
  id: number
  email: string
  password: string
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
    const { email, password } = await readValidatedBody(event, z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }).parse)

    const user = await db.sql<{ rows: DBUser[] }>`SELECT * FROM users WHERE email = ${email}`.then(result => result.rows[0])

    if (!user) {
      throw invalidCredentialsError
    }

    if (!(await verifyPassword(user.password, password))) {
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
