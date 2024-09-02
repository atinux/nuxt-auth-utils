import { bufferToBase64URLString } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types'

export default defineCredentialRegistrationEventHandler({
  async storeChallenge(_, options, attemptId) {
    await useStorage().setItem(`attempt:${attemptId}`, options)
  },
  async getChallenge(_, attemptId) {
    const options = await useStorage<PublicKeyCredentialCreationOptionsJSON>().getItem(`attempt:${attemptId}`)
    await useStorage().removeItem(`attempt:${attemptId}`)
    if (!options)
      throw createError({ message: 'Challenge not found', statusCode: 400 })

    return options
  },
  async onSuccces(event, response, body) {
    const user = {
      id: 1,
      displayName: body.displayName,
      userName: body.userName,
      publicKey: bufferToBase64URLString(response!.credentialPublicKey),
      counter: response!.counter,
    }
    await useStorage('db').setItem(`users:${response!.credentialID}`, user)
    await setUserSession(event, {
      user: {
        webauthn: response!.credentialID,
      },
      loggedInAt: Date.now(),
    })
  },
  async registrationOptions() {
    return {
      rpName: 'My Relying Party Name',
    }
  },
})
