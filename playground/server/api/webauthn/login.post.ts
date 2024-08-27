import { base64URLStringToBuffer } from '@simplewebauthn/browser'
import type { AuthenticatorTransportFuture, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

interface CredentialData {
  id: string
  publicKey: string
  counter: number
  transports?: AuthenticatorTransportFuture[]
}

export default defineCredentialAuthenticationEventHandler({
  storeChallenge: async (_, options, attemptId) => {
    await useStorage().setItem(`attempt:${attemptId}`, options)
  },
  getChallenge: async (event, attemptId) => {
    const options = await useStorage<PublicKeyCredentialRequestOptionsJSON>().getItem(`attempt:${attemptId}`)
    await useStorage().removeItem(`attempt:${attemptId}`)
    if (!options)
      throw createError({ statusCode: 400 })

    const body = await readBody(event)
    const credential = await useStorage<CredentialData>('db').getItem(`users:${body.response.id}`)
    if (!credential)
      throw createError({ statusCode: 400 })

    return {
      options,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(base64URLStringToBuffer(credential.publicKey)),
        counter: credential.counter,
        transports: credential.transports,
      },
    }
  },
  onSuccces: async (event, response) => {
    const user = await useStorage<CredentialData>('db').getItem(`users:${response!.credentialID}`)
    if (!user)
      throw createError({ statusCode: 400 })

    user.counter = response!.newCounter
    await useStorage('db').setItem(`users:${response!.credentialID}`, user)

    await setUserSession(event, {
      user: {
        credential: response!.credentialID,
      },
      loggedInAt: Date.now(),
    })
  },
})
