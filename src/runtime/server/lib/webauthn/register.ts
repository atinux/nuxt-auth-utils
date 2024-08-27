import type { H3Event } from 'h3'
import { eventHandler, H3Error, createError, getRequestURL, readBody, getQuery } from 'h3'
import type { GenerateRegistrationOptionsOpts, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from '@simplewebauthn/types'
import { bufferToBase64URLString } from '@simplewebauthn/browser'
import { getRandomValues } from 'uncrypto'
import { useRuntimeConfig } from '#imports'

type RegistrationBody = {
  userName: string
  displayName?: string
  verify: false
} | {
  userName: string
  displayName?: string
  verify: true
  response: RegistrationResponseJSON
}

interface PasskeyRegistrationEventHandlerOptions {
  registrationOptions?: (event: H3Event) => Partial<GenerateRegistrationOptionsOpts> | Promise<Partial<GenerateRegistrationOptionsOpts>>
  storeChallenge: (event: H3Event, options: PublicKeyCredentialCreationOptionsJSON, attemptId: string) => void | Promise<void>
  getChallenge: (event: H3Event, attemptId: string) => PublicKeyCredentialCreationOptionsJSON | Promise<PublicKeyCredentialCreationOptionsJSON>
  onSuccces: (event: H3Event, response: VerifiedRegistrationResponse['registrationInfo'], body: RegistrationBody) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
}

export function definePasskeyRegistrationEventHandler({
  storeChallenge,
  getChallenge,
  onSuccces,
  onError,
  registrationOptions,
}: PasskeyRegistrationEventHandlerOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<RegistrationBody>(event)
    if (body.verify === undefined || !body.userName)
      throw createError({ statusCode: 400 })

    const _config = defu(await registrationOptions?.(event) ?? {}, useRuntimeConfig(event).passkey.registrationOptions, {
      rpID: url.hostname,
      rpName: 'Nuxt Auth Utils',
      userName: body.userName,
      userDisplayName: body.displayName,
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    } satisfies GenerateRegistrationOptionsOpts)

    try {
      if (!body.verify) {
        const options = await generateRegistrationOptions(_config as GenerateRegistrationOptionsOpts)
        const attemptId = bufferToBase64URLString(getRandomValues(new Uint8Array(32)))
        await storeChallenge(event, options, attemptId)
        return {
          creationOptions: options,
          attemptId,
        }
      }

      const { attemptId } = getQuery<{ attemptId: string }>(event)
      if (!attemptId)
        throw createError({ statusCode: 400 })

      const options = await getChallenge(event, attemptId)
      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: options.challenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        requireUserVerification: false, // TODO: make this configurable
      })

      if (!verification.verified)
        throw createError({ statusCode: 400, message: 'Failed to verify registration response' })

      await onSuccces(event, verification.registrationInfo, body)
      return verification
    }
    catch (error) {
      if (!onError) throw error
      if (error instanceof H3Error)
        return onError(event, error)
      return onError(event, createError({ statusCode: 500, message: 'Failed to register passkey' }))
    }
  })
}
