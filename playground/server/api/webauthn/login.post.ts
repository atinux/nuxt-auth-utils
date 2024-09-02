import { base64URLStringToBuffer } from '@simplewebauthn/browser'
import type { AuthenticatorDevice } from '#auth-utils'

interface Credential {
  userName: string
  authenticator: AuthenticatorDevice
}

interface User {
  userName: string
  displayName?: string
  credentials: AuthenticatorDevice[]
}

export default defineCredentialAuthenticationEventHandler({
  async getCredential(_, credentialID) {
    const credential = await useStorage<Credential>('db').getItem(`credentials:${credentialID}`)
    if (!credential)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    return {
      credentialID: credential.authenticator.credentialID,
      credentialPublicKey: new Uint8Array(base64URLStringToBuffer(credential.authenticator.credentialPublicKey)),
      counter: credential.authenticator.counter,
      transports: credential.authenticator.transports,
    }
  },
  async onSuccces(event, { authenticationInfo }) {
    const credential = await useStorage<Credential>('db').getItem(`credentials:${authenticationInfo.credentialID}`)
    if (!credential)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    const user = await useStorage<User>('db').getItem(`users:${credential.userName}`)
    if (!user)
      throw createError({ statusCode: 400, message: 'User not found' })

    await setUserSession(event, {
      user: {
        webauthn: user.displayName,
      },
      loggedInAt: Date.now(),
    })
  },
  async authenticationOptions(event) {
    const body = await readBody(event)
    // If no userName is provided, no credentials can be returned
    if (!body.userName || body.userName === '')
      return {}

    const user = await useStorage<User>('db').getItem(`users:${body.userName}`)
    if (!user)
      throw createError({ statusCode: 400, message: 'User not found' })

    // If user is found, only allow credentials that are registered
    return {
      allowCredentials: user.credentials.map(credential => ({ id: credential.credentialID, type: 'public-key' })),
    }
  },
})
