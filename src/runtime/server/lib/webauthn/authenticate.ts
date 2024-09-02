import type { H3Event } from 'h3'
import { eventHandler, H3Error, createError, getRequestURL, readBody } from 'h3'
import type { GenerateAuthenticationOptionsOpts, VerifiedAuthenticationResponse } from '@simplewebauthn/server'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import type { AuthenticationResponseJSON, AuthenticatorDevice, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'
import { getRandomValues } from 'uncrypto'
import { bufferToBase64URLString } from '@simplewebauthn/browser'
import { storeChallengeAsSession, getChallengeFromSession } from './utils'
import { useRuntimeConfig } from '#imports'

type AuthenticationBody = {
  verify: false
  userName?: string
} | {
  verify: true
  attemptId: string
  userName?: string
  response: AuthenticationResponseJSON
}

type SuccessData = {
  userName?: string
  authenticationInfo: Exclude<VerifiedAuthenticationResponse['authenticationInfo'], undefined>
}

// This way if you can only define both storeChallenge and getChallenge or neither
interface BaseOptions {
  authenticationOptions?: (event: H3Event) => Partial<GenerateAuthenticationOptionsOpts> | Promise<Partial<GenerateAuthenticationOptionsOpts>>
  getCredential: (event: H3Event, credentialID: string) => AuthenticatorDevice | Promise<AuthenticatorDevice>
  onSuccces: (event: H3Event, data: SuccessData) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
}
interface StoreOptions extends BaseOptions {
  storeChallenge: (event: H3Event, options: PublicKeyCredentialRequestOptionsJSON, attemptId: string) => void | Promise<void>
  getChallenge: (event: H3Event, attemptId: string) => string | Promise<string>
}
interface NoStoreOptions extends BaseOptions {
  storeChallenge?: undefined
  getChallenge?: undefined
}

export function defineCredentialAuthenticationEventHandler({
  storeChallenge,
  getChallenge,
  getCredential,
  onSuccces,
  onError,
  authenticationOptions,
}: StoreOptions | NoStoreOptions) {
  return eventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<AuthenticationBody>(event)
    const _config = defu(await authenticationOptions?.(event) ?? {}, useRuntimeConfig(event).webauthn.authenticationOptions, {
      rpID: url.hostname,
    } satisfies GenerateAuthenticationOptionsOpts)

    try {
      if (!body.verify) {
        const options = await generateAuthenticationOptions(_config as GenerateAuthenticationOptionsOpts)
        const attemptId = bufferToBase64URLString(getRandomValues(new Uint8Array(32)))

        if (storeChallenge)
          await storeChallenge(event, options, attemptId)
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

      const authenticator = await getCredential(event, body.response.id)
      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: challenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        authenticator,
      })

      if (!verification.verified)
        throw createError({ statusCode: 400, message: 'Failed to verify registration response' })

      await onSuccces(event, {
        userName: body.userName,
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
