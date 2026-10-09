import { defineEventHandler, createError, getRequestURL, isNuxtError, readBody, useRuntimeConfig } from 'nuxt/server'
import type { EventHandler, NuxtError } from 'nuxt/server'
import type { GenerateAuthenticationOptionsOpts } from '@simplewebauthn/server'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import defu from 'defu'
import { getRandomValues } from 'uncrypto'
import { base64URLStringToBuffer, bufferToBase64URLString } from '@simplewebauthn/browser'
import type { AuthenticationBody } from '../../../types/webauthn'
import type { WebAuthnAuthenticateEventHandlerOptions, WebAuthnCredential } from '#auth-utils'

export function defineWebAuthnAuthenticateEventHandler<T extends WebAuthnCredential>({
  storeChallenge,
  getChallenge,
  getCredential,
  allowCredentials,
  getOptions,
  onSuccess,
  onError,
}: WebAuthnAuthenticateEventHandlerOptions<T>): EventHandler {
  return defineEventHandler(async (event) => {
    const url = getRequestURL(event)
    const body = await readBody<AuthenticationBody>(event)
    const _config = defu(await getOptions?.(event, body) ?? {}, useRuntimeConfig().webauthn.authenticate, {
      rpID: url.hostname,
    } satisfies GenerateAuthenticationOptionsOpts)

    if (!storeChallenge) {
      _config.challenge = ''
    }

    try {
      if (!body.verify) {
        if (allowCredentials && body.userName) {
          _config.allowCredentials = await allowCredentials(event, body.userName)
        }

        const options = await generateAuthenticationOptions(_config as GenerateAuthenticationOptionsOpts)
        const attemptId = bufferToBase64URLString(getRandomValues(new Uint8Array(32)).buffer)

        if (storeChallenge) {
          await storeChallenge(event, options.challenge, attemptId)
        }

        return {
          requestOptions: options,
          attemptId,
        }
      }

      if (!body.attemptId)
        throw createError({ status: 400 })

      let expectedChallenge = ''
      if (getChallenge) {
        expectedChallenge = await getChallenge(event, body.attemptId)
      }

      const credential = await getCredential(event, body.response.id)
      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: url.origin,
        expectedRPID: url.hostname,
        requireUserVerification: false, // TODO: make configurable https://simplewebauthn.dev/docs/advanced/passkeys#verifyauthenticationresponse
        credential: {
          id: credential.id,
          publicKey: new Uint8Array(base64URLStringToBuffer(credential.publicKey)),
          counter: credential.counter,
          transports: credential.transports,
        },
      })

      if (!verification.verified)
        throw createError({ status: 400, message: 'Failed to verify registration response' })

      await onSuccess(event, {
        credential,
        authenticationInfo: verification.authenticationInfo!,
      })
      return verification
    }
    catch (error) {
      if (!onError) throw error
      if (isNuxtError(error))
        return onError(event, error as NuxtError)
      return onError(event, createError({ status: 500, message: 'Failed to authenticate credential' }))
    }
  })
}
