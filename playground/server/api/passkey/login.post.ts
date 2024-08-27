import { base64URLStringToBuffer } from '@simplewebauthn/browser'
import type { AuthenticatorTransportFuture, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

interface PasskeyData {
  id: string
  publicKey: string
  counter: number
  transports?: AuthenticatorTransportFuture[]
}

export default definePasskeyAuthenticationEventHandler({
  storeChallenge: async (_, options, attemptId) => {
    await useStorage().setItem(`passkeys:${attemptId}`, options)
  },
  getChallenge: async (event, attemptId) => {
    const options = await useStorage<PublicKeyCredentialRequestOptionsJSON>().getItem(`passkeys:${attemptId}`)
    await useStorage().removeItem(`passkeys:${attemptId}`)
    if (!options)
      throw createError({ statusCode: 400 })

    const body = await readBody(event)
    const passkey = await useStorage<PasskeyData>('db').getItem(`users:${body.response.id}`)
    if (!passkey)
      throw createError({ statusCode: 400 })

    return {
      options,
      passkey: {
        id: passkey.id,
        publicKey: new Uint8Array(base64URLStringToBuffer(passkey.publicKey)),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    }
  },
  onSuccces: async (event, response) => {
    const user = await useStorage<PasskeyData>('db').getItem(`users:${response!.credentialID}`)
    if (!user)
      throw createError({ statusCode: 400 })

    user.counter = response!.newCounter
    await useStorage('db').setItem(`users:${response!.credentialID}`, user)

    await setUserSession(event, {
      user: {
        passkey: response!.credentialID,
      },
      loggedInAt: Date.now(),
    })
  },
})
