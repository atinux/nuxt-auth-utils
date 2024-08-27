import { bufferToBase64URLString } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types'

export default defineCredentialRegistrationEventHandler({
  storeChallenge: async (_, options, attemptId) => {
    await useStorage().setItem(`attempt:${attemptId}`, options)
  },
  getChallenge: async (_, attemptId) => {
    const options = await useStorage<PublicKeyCredentialCreationOptionsJSON>().getItem(`attempt:${attemptId}`)
    await useStorage().removeItem(`attempt:${attemptId}`)
    if (!options)
      throw createError({ statusCode: 400 })

    return options
  },
  onSuccces: async (event, response, body) => {
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
        credential: response!.credentialID,
      },
      loggedInAt: Date.now(),
    })
  },
  registrationOptions: async () => {
    return {
      rpName: 'My Relying Party Name',
    }
  },
})
