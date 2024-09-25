import { z } from 'zod'

export default defineLazyEventHandler(async () => {
  const db = useDatabase()

  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT UNIQUE NOT NULL, "password" TEXT NOT NULL)`

  return defineEventHandler(async (event) => {
    const { email, password } = await readValidatedBody(event, z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }).parse)

    const hashedPassword = await hashPassword(password)

    await db.sql`INSERT INTO users(email, password) VALUES (${email}, ${hashedPassword})`

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
