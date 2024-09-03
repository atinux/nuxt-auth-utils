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
    await useStorage<User>('db').setItem(`users:${userName}`, {
      userName,
      displayName,
      credentials: [authenticator],
    })
    await useStorage<Credential>('db').setItem(`credentials:${authenticator.credentialID}`, {
      userName,
      authenticator,
    })

    await setUserSession(event, {
      user: {
        webauthn: displayName,
      },
      loggedInAt: Date.now(),
    })
  },
})
