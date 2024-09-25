interface Credential {
  userId: number
  credentialId: string
  credentialPublicKey: string
  counter: number
  backedUp: number
  transports: string
}

export default defineWebAuthnAuthenticateEventHandler({
  async getCredential(_event, credentialID) {
    const db = useDatabase()
    const { rows } = await db.sql<{ rows: Credential[] }>`SELECT * FROM credentials WHERE credentialID = ${credentialID}`

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
  async onSuccess(event, { authenticator, authenticationInfo }) {
    const db = useDatabase()
    const { rows } = await db.sql<{ rows: string[] }>`
      SELECT
        users.email as email
      FROM
        credentials
      INNER JOIN users ON users.id = credentials.userId
      WHERE
        credentialID = ${authenticator.credentialID}`

    // Update the counter
    await db.sql`UPDATE credentials SET counter = ${authenticationInfo.newCounter} WHERE credentialID = ${authenticator.credentialID}`

    const [{ email }] = rows
    await setUserSession(event, {
      user: {
        webauthn: email,
      },
      loggedInAt: Date.now(),
    })
  },
  async getOptions(event) {
    const body = await readBody(event)
    // If no userName is provided, no credentials can be returned
    if (!body.userName || body.userName === '')
      return {}

    const db = useDatabase()
    const { rows } = await db.sql<{ rows: { id: string }[] }>`
      SELECT
        credentials.credentialID as id
      FROM
        users
      LEFT JOIN credentials ON credentials.userId = users.id
      WHERE
        users.email = ${body.userName}`

    if (!rows.length)
      throw createError({ statusCode: 400, message: 'User not found' })

    // If user is found, only allow credentials that are registered
    // The browser will automatically try to use the credential that it knows about
    // Skipping the step for the user to select a credential for a better user experience
    return {
      allowCredentials: rows,
    }
  },
})
