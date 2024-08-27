import type { H3Event } from 'h3'
import { eventHandler, H3Error, createError, getRequestURL, readBody, getQuery } from 'h3'
import type { GenerateAuthenticationOptionsOpts, VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'
import { getRandomValues } from 'uncrypto'
import { bufferToBase64URLString } from '@simplewebauthn/browser'
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
  authenticationOptions?: (event: H3Event) => Partial<GenerateAuthenticationOptionsOpts> | Promise<Partial<GenerateAuthenticationOptionsOpts>>
  storeChallenge: (event: H3Event, options: PublicKeyCredentialRequestOptionsJSON, attemptId: string) => void | Promise<void>
  getChallenge: (event: H3Event, attemptId: string) => AuthenticationData | Promise<AuthenticationData>
  onSuccces: (event: H3Event, response: VerifiedAuthenticationResponse['authenticationInfo']) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
}

export function definePasskeyAuthenticationEventHandler({
  storeChallenge,
  getChallenge,
  onSuccces,
  onError,
  authenticationOptions,
}: PasskeyAuthenticationEventHandlerOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<AuthenticationBody>(event)
    if (body.verify === undefined)
      throw createError({ statusCode: 400 })

    const _config = defu(await authenticationOptions?.(event) ?? {}, useRuntimeConfig(event).passkey.authenticationOptions, {
      rpID: url.hostname,
    } satisfies GenerateAuthenticationOptionsOpts)

    try {
      if (!body.verify) {
        const options = await generateAuthenticationOptions(_config as GenerateAuthenticationOptionsOpts)
        const attemptId = bufferToBase64URLString(getRandomValues(new Uint8Array(32)))
        await storeChallenge(event, options, attemptId)
        return {
          requestOptions: options,
          attemptId,
        }
      }

      const { attemptId } = getQuery<{ attemptId: string }>(event)
      if (!attemptId)
        throw createError({ statusCode: 400 })

      const { options, passkey } = await getChallenge(event, attemptId)
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
