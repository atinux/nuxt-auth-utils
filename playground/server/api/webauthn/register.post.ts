import { z } from 'zod'

export default defineWebAuthnRegisterEventHandler({
  async validateUser(userBody, event) {
    const session = await getUserSession(event)
    if (session.user?.email && session.user.email !== userBody.userName) {
      throw createError({ statusCode: 400, message: 'Email not matching curent session' })
    }

    return z.object({
      userName: z.string().email().trim(),
      displayName: z.string().trim().optional(),
      company: z.string().trim().optional(),
    }).parse(userBody)
  },
  async onSuccess(event, { credential, user }) {
    const db = useDatabase()
    try {
      await db.sql`BEGIN TRANSACTION`
      let { rows: [dbUser] } = await db.sql`SELECT * FROM users WHERE email = ${user.userName}`
      if (!dbUser) {
        await db.sql`INSERT INTO users (email) VALUES (${user.userName})`
        dbUser = (await db.sql`SELECT * FROM users WHERE email = ${user.userName}`).rows?.[0]
      }
      await db.sql`
        INSERT INTO credentials (
          userId,
          id,
          publicKey,
          counter,
          backedUp,
          transports
        ) VALUES (
          ${dbUser.id},
          ${credential.id},
          ${credential.publicKey},
          ${credential.counter},
          ${credential.backedUp ? 1 : 0},
          ${JSON.stringify(credential.transports ?? [])}
        )`
      await db.sql`COMMIT`
      await setUserSession(event, {
        user: {
          webauthn: dbUser.email,
        },
        loggedInAt: Date.now(),
      })
    }
    catch (err) {
      await db.sql`ROLLBACK`
      throw createError({
        statusCode: 500,
        message: err.message.includes('UNIQUE constraint failed') ? 'User already registered' : 'Failed to store credential',
      })
    }
  },
})
