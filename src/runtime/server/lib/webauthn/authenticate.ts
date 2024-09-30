import { eventHandler, H3Error, createError, getRequestURL, readBody } from 'h3'
import type { GenerateAuthenticationOptionsOpts } from '@simplewebauthn/server'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { getRandomValues } from 'uncrypto'
import { base64URLStringToBuffer, bufferToBase64URLString } from '@simplewebauthn/browser'
import { storeChallengeAsSession, getChallengeFromSession } from './utils'
import { useRuntimeConfig } from '#imports'
import type { WebAuthnAuthenticateEventHandlerOptions } from '#auth-utils'

type AuthenticationBody = {
  verify: false
  userName?: string
} | {
  verify: true
  attemptId: string
  userName?: string
  response: AuthenticationResponseJSON
}

export function defineWebAuthnAuthenticateEventHandler({
  storeChallenge,
  getChallenge,
  getCredential,
  allowCredentials,
  getOptions,
  onSuccess,
  onError,
}: WebAuthnAuthenticateEventHandlerOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<AuthenticationBody>(event)
    const _config = defu(await getOptions?.(event) ?? {}, useRuntimeConfig(event).webauthn.authenticate, {
      rpID: url.hostname,
    } satisfies GenerateAuthenticationOptionsOpts)

    if (allowCredentials && body.userName) {
      _config.allowCredentials = await allowCredentials(event, body.userName)
    }

    try {
      if (!body.verify) {
        const options = await generateAuthenticationOptions(_config as GenerateAuthenticationOptionsOpts)
        const attemptId = bufferToBase64URLString(getRandomValues(new Uint8Array(32)))

        if (storeChallenge)
          await storeChallenge(event, options.challenge, attemptId)
        else
          await storeChallengeAsSession(event, options.challenge, attemptId)

        return {
          requestOptions: options,
          attemptId,
        }
      }

      if (!body.attemptId)
        throw createError({ statusCode: 400 })

      let challenge: string
      if (getChallenge)
        challenge = await getChallenge(event, body.attemptId)
      else
        challenge = await getChallengeFromSession(event, body.attemptId)

      const credential = await getCredential(event, body.response.id)
      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: challenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        authenticator: {
          credentialID: credential.id,
          credentialPublicKey: new Uint8Array(base64URLStringToBuffer(credential.publicKey)),
          counter: credential.counter,
          transports: credential.transports,
        },
      })

      if (!verification.verified)
        throw createError({ statusCode: 400, message: 'Failed to verify registration response' })

      await onSuccess(event, {
        credential,
        authenticationInfo: verification.authenticationInfo!,
      })
      return verification
    }
    catch (error) {
      if (!onError) throw error
      if (error instanceof H3Error)
        return onError(event, error)
      return onError(event, createError({ statusCode: 500, message: 'Failed to authenticate credential' }))
    }
  })
}
