import { createError, defineEventHandler, readValidatedBody, setResponseStatus } from 'nuxt/server'
import { z } from 'zod'

interface DBUser {
  id: number
  email: string
  password: string
}

const invalidCredentialsError = createError({
  status: 401,
  // This message is intentionally vague to prevent user enumeration attacks.
  message: 'Invalid credentials',
})

export default defineEventHandler(async (event) => {
  const db = useDatabase()

  const { email, password } = await readValidatedBody(event, z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }))

  const user = await db.sql<{ rows: DBUser[] }>`SELECT * FROM users WHERE email = ${email}`.then(result => result.rows[0])

  if (!user) {
    throw invalidCredentialsError
  }

  if (!(await verifyPassword(user.password, password))) {
    throw invalidCredentialsError
  }

  if (passwordNeedsReHash(password)) {
    await db.sql`UPDATE users SET password = ${await hashPassword(password)} WHERE id = ${user.id}`
  }

  await setUserSession(event, {
    user: {
      email,
    },
    loggedInAt: Date.now(),
  })

  setResponseStatus(event, 201)
  return {}
})
