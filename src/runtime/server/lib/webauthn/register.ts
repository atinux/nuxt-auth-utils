import type { H3Event } from 'h3'
import { eventHandler, H3Error, createError, getRequestURL, readBody } from 'h3'
import type { GenerateRegistrationOptionsOpts, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types'
import { useRuntimeConfig } from '#imports'

interface PasskeyRegistrationEventHandlerOptions {
  storeChallenge: (event: H3Event, options: PublicKeyCredentialCreationOptionsJSON) => void | Promise<void>
  getChallenge: (event: H3Event) => PublicKeyCredentialCreationOptionsJSON | Promise<PublicKeyCredentialCreationOptionsJSON>
  onSuccces: (event: H3Event, response: VerifiedRegistrationResponse['registrationInfo'], body: any) => void | Promise<void> // FIXME: type body
  onError: (event: H3Event, error: H3Error) => void | Promise<void>
  config: (event: H3Event) => GenerateRegistrationOptionsOpts | Promise<GenerateRegistrationOptionsOpts>
}

export default function definePasskeyRegistrationEventHandler({
  storeChallenge,
  getChallenge,
  onSuccces,
  onError,
  config,
}: PasskeyRegistrationEventHandlerOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const _config = defu(await config(event), useRuntimeConfig(event).passkey.registrationOptions, {
      rpID: url.hostname,
      rpName: 'Nuxt Auth Utils',
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    })

    const body = await readBody(event)
    if (body.verify === undefined || !body.userName)
      throw createError({ statusCode: 400 })

    try {
      if (!body.verify) {
        const options = await generateRegistrationOptions(_config as GenerateRegistrationOptionsOpts)
        await storeChallenge(event, options)
        return options
      }

      const options = await getChallenge(event)
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
