import { createError } from 'nuxt/server'
import { challenges, credentials } from '../../utils/webauthn-store'

export default defineWebAuthnRegisterEventHandler({
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
  async onSuccess(_event, { user, credential }) {
    credentials.set(credential.id, { ...credential, userName: user.userName })
  },
})
