import type { H3Event } from 'h3'
import { eventHandler, H3Error, createError, getRequestURL, readBody } from 'h3'
import type { GenerateAuthenticationOptionsOpts, VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'
import { useRuntimeConfig } from '#imports'

// FIXME: better type name?
interface AuthenticationData {
  passkey: {
    id: string
    publicKey: Uint8Array
    counter: number
    transports?: AuthenticatorTransportFuture[]
  }
  options: PublicKeyCredentialRequestOptionsJSON
}

type AuthenticationBody = {
  verify: false
} | {
  verify: true
  response: AuthenticationResponseJSON
}

interface PasskeyAuthenticationEventHandlerOptions {
  config?: (event: H3Event) => Partial<GenerateAuthenticationOptionsOpts> | Promise<Partial<GenerateAuthenticationOptionsOpts>>
  storeChallenge: (event: H3Event, options: PublicKeyCredentialRequestOptionsJSON) => void | Promise<void>
  getChallenge: (event: H3Event) => AuthenticationData | Promise<AuthenticationData>
  onSuccces: (event: H3Event, response: VerifiedAuthenticationResponse['authenticationInfo']) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
}

export default function definePasskeyAuthenticationEventHandler({
  storeChallenge,
  getChallenge,
  onSuccces,
  onError,
  config,
}: PasskeyAuthenticationEventHandlerOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<AuthenticationBody>(event)
    if (body.verify === undefined)
      throw createError({ statusCode: 400 })

    const _config = defu(await config?.(event) ?? {}, useRuntimeConfig(event).passkey.authenticationOptions, {
      rpID: url.hostname,
    } satisfies GenerateAuthenticationOptionsOpts)

    try {
      if (!body.verify) {
        const options = await generateAuthenticationOptions(_config as GenerateAuthenticationOptionsOpts)
        await storeChallenge(event, options)
        return options
      }

      const { options, passkey } = await getChallenge(event)
      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: options.challenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        authenticator: {
          credentialID: body.response.id, // TODO: Is this correct?
          credentialPublicKey: passkey.publicKey,
          counter: passkey.counter,
          transports: passkey.transports,
        },
      })

      if (!verification.verified)
        throw createError({ statusCode: 400, message: 'Failed to verify registration response' })

      await onSuccces(event, verification.authenticationInfo)
      return verification
    }
    catch (error) {
      if (!onError) throw error
      if (error instanceof H3Error)
        return onError(event, error)
      return onError(event, createError({ statusCode: 500, message: 'Failed to authenticate passkey' }))
    }
  })
}
