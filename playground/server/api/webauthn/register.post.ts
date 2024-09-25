export default defineWebAuthnRegisterEventHandler({
  async onSuccess(event, { authenticator, userName }) {
    const db = useDatabase()
    try {
      await db.sql`BEGIN TRANSACTION`
      await db.sql`INSERT INTO users (email) VALUES (${userName})`
      const { rows: [user] } = await db.sql`SELECT * FROM users WHERE email = ${userName}`
      await db.sql`
        INSERT INTO credentials (
          userId,
          credentialID,
          credentialPublicKey,
          counter,
          backedUp,
          transports
        ) VALUES (
          ${user.id},
          ${authenticator.credentialID},
          ${authenticator.credentialPublicKey},
          ${authenticator.counter},
          ${authenticator.backedUp ? 1 : 0},
          ${JSON.stringify(authenticator.transports ?? [])}
        )`
      await db.sql`COMMIT`
      await setUserSession(event, {
        user: {
          webauthn: user.email,
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
