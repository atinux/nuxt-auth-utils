import { bufferToBase64URLString } from '@simplewebauthn/browser'
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

export default defineCredentialRegistrationEventHandler({
  async onSuccces(event, { authenticator, userName, displayName }) {
    const authenticatorJSON = {
      credentialID: authenticator.credentialID,
      credentialPublicKey: bufferToBase64URLString(authenticator.credentialPublicKey),
      counter: authenticator.counter,
      transports: authenticator.transports,
    }
    await useStorage<User>('db').setItem(`users:${userName}`, {
      userName,
      displayName,
      credentials: [authenticatorJSON],
    })
    await useStorage<Credential>('db').setItem(`credentials:${authenticator.credentialID}`, {
      userName,
      authenticator: authenticatorJSON,
    })

    await setUserSession(event, {
      user: {
        webauthn: displayName,
      },
      loggedInAt: Date.now(),
    })
  },
  registrationOptions() {
    return {
      rpName: 'My Relying Party Name',
    }
  },
})
