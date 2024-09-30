interface Credential {
  userId: number
  id: string
  publicKey: string
  counter: number
  backedUp: number
  transports: string
}

export default defineWebAuthnAuthenticateEventHandler({
  async allowCredentials(event, userName) {
    const { rows } = await useDatabase().sql<{ rows: { id: string }[] }>`
      SELECT credentials.id
      FROM users
      LEFT JOIN credentials ON credentials.userId = users.id
      WHERE users.email = ${userName}`

    if (!rows.length)
      throw createError({ statusCode: 400, message: 'User not found' })

    return rows
  },
  async getCredential(event, credentialId) {
    const db = useDatabase()
    const { rows } = await db.sql<{ rows: Credential[] }>`SELECT * FROM credentials WHERE id = ${credentialId}`

    // The credential trying to authenticate is not registered, so there is no account to log in to
    if (!rows.length)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    const [credential] = rows
    return {
      ...credential,
      backedUp: Boolean(credential.backedUp),
      transports: JSON.parse(credential.transports),
    }
  },
  async onSuccess(event, { credential, authenticationInfo }) {
    const db = useDatabase()
    const { rows } = await db.sql<{ rows: string[] }>`
      SELECT users.email
      FROM credentials
      INNER JOIN users ON users.id = credentials.userId
      WHERE credentials.id = ${credential.id}`

    // Update the counter
    await db.sql`UPDATE credentials SET counter = ${authenticationInfo.newCounter} WHERE id = ${credential.id}`

    const [{ email }] = rows
    await setUserSession(event, {
      user: {
        webauthn: email,
      },
      loggedInAt: Date.now(),
    })
  },
})
