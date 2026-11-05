import { createError } from 'nuxt/server'
import { challenges, credentials } from '../../utils/webauthn-store'

export default defineWebAuthnAuthenticateEventHandler({
  async storeChallenge(_event, challenge, attemptId) {
    challenges.set(attemptId, challenge)
  },
  async getChallenge(_event, attemptId) {
    const challenge = challenges.get(attemptId)
    if (!challenge) {
      throw createError({ status: 400, message: 'Unknown challenge' })
    }
    challenges.delete(attemptId)
    return challenge
  },
  async allowCredentials(_event, userName) {
    return [...credentials.values()]
      .filter(credential => credential.userName === userName)
      .map(credential => ({ id: credential.id, transports: credential.transports }))
  },
  async getCredential(_event, credentialId) {
    const credential = credentials.get(credentialId)
    if (!credential) {
      throw createError({ status: 400, message: 'Credential not found' })
    }
    return credential
  },
  async onSuccess(event, { credential }) {
    await setUserSession(event, { user: { name: credential.userName } })
  },
})
