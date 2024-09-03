import type { H3Event } from 'h3'
import { eventHandler, H3Error, createError, getRequestURL, readBody } from 'h3'
import type { GenerateRegistrationOptionsOpts, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
import { bufferToBase64URLString } from '@simplewebauthn/browser'
import { getRandomValues } from 'uncrypto'
import { storeChallengeAsSession, getChallengeFromSession } from './utils'
import { useRuntimeConfig } from '#imports'
import type { AuthenticatorDevice } from '#auth-utils'

type RegistrationBody = {
  userName: string
  displayName?: string
  verify: false
} | {
  userName: string
  displayName?: string
  verify: true
  attemptId: string
  response: RegistrationResponseJSON
}

type SuccessData = {
  userName: string
  displayName?: string
  authenticator: AuthenticatorDevice
  registrationInfo: Exclude<VerifiedRegistrationResponse['registrationInfo'], undefined>
}

interface WebauthnRegistrationConfig extends Partial<GenerateRegistrationOptionsOpts> {
  requiresUserVerification?: boolean
}

interface CredentialRegistrationEventHandlerOptions {
  registrationOptions?: (event: H3Event) => WebauthnRegistrationConfig | Promise<WebauthnRegistrationConfig>
  storeChallenge?: (event: H3Event, challenge: string, attemptId: string) => void | Promise<void>
  getChallenge?: (event: H3Event, attemptId: string) => string | Promise<string>
  onSuccces: (event: H3Event, data: SuccessData) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
}

export function defineCredentialRegistrationEventHandler({
  storeChallenge,
  getChallenge,
  onSuccces,
  onError,
  registrationOptions,
}: CredentialRegistrationEventHandlerOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<RegistrationBody>(event)
    if (body.verify === undefined || !body.userName)
      throw createError({
        message: 'Invalid request, missing userName or verify property',
        statusCode: 400,
      })

    const _config = defu(await registrationOptions?.(event) ?? {}, useRuntimeConfig(event).webauthn.registrationOptions, {
      rpID: url.hostname,
      rpName: url.hostname,
      userName: body.userName,
      userDisplayName: body.displayName,
      requiresUserVerification: false,
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    } satisfies WebauthnRegistrationConfig)

    try {
      if (!body.verify) {
        const options = await generateRegistrationOptions(_config as GenerateRegistrationOptionsOpts)
        const attemptId = bufferToBase64URLString(getRandomValues(new Uint8Array(32)))

        // If the developer has stricter storage requirements, they can implement their own storeChallenge function to store the options in a database or KV store
        if (storeChallenge)
          await storeChallenge?.(event, options.challenge, attemptId)
        else
          await storeChallengeAsSession(event, options.challenge, attemptId)

        return {
          creationOptions: options,
          attemptId,
        }
      }

      if (!body.attemptId) {
        throw createError({
          message: 'Invalid request, missing attemptId',
          statusCode: 400,
        })
      }

      let expectedChallenge: string
      if (getChallenge)
        expectedChallenge = await getChallenge(event, body.attemptId)
      else
        expectedChallenge = await getChallengeFromSession(event, body.attemptId)

      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        requireUserVerification: _config.requiresUserVerification,
        supportedAlgorithmIDs: _config.supportedAlgorithmIDs,
      })

      if (!verification.verified) {
        throw createError({
          message: 'Failed to verify registration response',
          statusCode: 400,
        })
      }

      await onSuccces(event, {
        userName: body.userName,
        displayName: body.displayName,
        authenticator: {
          credentialID: verification.registrationInfo!.credentialID,
          credentialPublicKey: bufferToBase64URLString(verification.registrationInfo!.credentialPublicKey),
          counter: verification.registrationInfo!.counter,
          transports: body.response.response.transports,
        },
        registrationInfo: verification.registrationInfo!,
      })
      return verification
    }
    catch (error) {
      if (!onError) throw error
      if (error instanceof H3Error)
        return onError(event, error)
      return onError(event, createError({ statusCode: 500, message: 'Failed to register credential' }))
    }
  })
}
