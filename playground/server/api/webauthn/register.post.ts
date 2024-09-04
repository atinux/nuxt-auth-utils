export default defineCredentialRegistrationEventHandler({
  async onSuccess(event, { authenticator, userName, displayName }) {
    const db = useDatabase()
    try {
      await db.sql`BEGIN TRANSACTION`
      await db.sql`INSERT INTO users (user_name) VALUES (${userName})`
      await db.sql`
        INSERT INTO credentials (
          user_name,
          credential_id,
          credential_public_key,
          counter,
          backed_up,
          transports
        ) VALUES (
          ${userName},
          ${authenticator.credentialID},
          ${authenticator.credentialPublicKey},
          ${authenticator.counter},
          ${authenticator.backedUp ? 1 : 0},
          ${JSON.stringify(authenticator.transports ?? [])}
        )`
      await db.sql`COMMIT`
    }
    catch (error) {
      await db.sql`ROLLBACK`
      console.error('Failed to store credential', error)
      throw createError({ statusCode: 500, message: 'Failed to store credential' })
    }

    await setUserSession(event, {
      user: {
        webauthn: displayName,
      },
      loggedInAt: Date.now(),
    })
  },
})
