interface Credential {
  user_name: string
  credential_id: string
  credential_public_key: string
  counter: number
  backed_up: boolean
  transports: string
}

export default defineCredentialAuthenticationEventHandler({
  async getCredential(_, credentialId) {
    const { rows } = await useDatabase()
      .sql<{ rows: Credential[] }>`SELECT * FROM credentials WHERE credential_id = ${credentialId}`

    // The credential trying to authenticate is not registered, so there is no account to log in to
    if (!rows.length)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    const credential = rows[0]
    return {
      credentialID: credential.credential_id,
      credentialPublicKey: credential.credential_public_key,
      counter: credential.counter,
      backedUp: Boolean(credential.backed_up),
      transports: JSON.parse(credential.transports),
    }
  },
  async onSuccess(event, { authenticator, authenticationInfo }) {
    const db = useDatabase()
    const { rows } = await db.sql<{ rows: string[] }>`
      SELECT
        user_name
      FROM
        credentials
      INNER JOIN users ON users.user_name = credentials.user_name
      WHERE
        credential_id = ${authenticator.credentialID}`

    // Update the counter
    await db.sql`UPDATE credentials SET counter = ${authenticationInfo.newCounter} WHERE credential_id = ${authenticator.credentialID}`

    const userName = rows[0]
    await setUserSession(event, {
      user: {
        webauthn: userName,
      },
      loggedInAt: Date.now(),
    })
  },
  async authenticationOptions(event) {
    const body = await readBody(event)
    // If no userName is provided, no credentials can be returned
    if (!body.userName || body.userName === '')
      return {}

    const db = useDatabase()
    const { rows } = await db.sql<{ rows: { id: string, type: string }[] }>`
      SELECT
        credentials.credential_id as id,
        'public-key' as type
      FROM
        users
      LEFT JOIN credentials ON credentials.user_name = users.user_name
      WHERE
        users.user_name = ${body.userName}`

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
