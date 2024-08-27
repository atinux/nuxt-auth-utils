import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type { VerifiedAuthenticationResponse, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from '@simplewebauthn/types'
import type { PasskeyComposable } from '#auth-utils'

interface RegistrationInitResponse {
  creationOptions: PublicKeyCredentialCreationOptionsJSON
  attemptId: string
}

interface AuthenticationInitResponse {
  requestOptions: PublicKeyCredentialRequestOptionsJSON
  attemptId: string
}

export function usePasskey(options: {
  registrationEndpoint: string
  authenticationEndpoint: string
  onRegistrationError?: (error: unknown) => void
  onAuthenticationError?: (error: unknown) => void
}): PasskeyComposable {
  async function register(userName: string, displayName?: string) {
    let attestationResponse: RegistrationResponseJSON | null = null
    const { creationOptions, attemptId } = await $fetch<RegistrationInitResponse>(options.registrationEndpoint, {
      method: 'POST',
      body: {
        userName,
        displayName,
        verify: false,
      },
    })

    try {
      attestationResponse = await startRegistration(creationOptions)
    }
    catch (error) {
      options.onRegistrationError?.(error)
      return false
    }

    if (!attestationResponse)
      return false

    const verificationResponse = await $fetch<VerifiedRegistrationResponse>(options.registrationEndpoint, {
      method: 'POST',
      body: {
        userName,
        displayName,
        response: attestationResponse,
        verify: true,
      },
      query: {
        attemptId,
      },
    })

    return verificationResponse && verificationResponse.verified
  }

  async function authenticate() {
    let assertionResponse: AuthenticationResponseJSON | null = null
    const { requestOptions, attemptId } = await $fetch<AuthenticationInitResponse>(options.authenticationEndpoint, {
      method: 'POST',
      body: {
        verify: false,
      },
    })

    try {
      assertionResponse = await startAuthentication(requestOptions)
    }
    catch (error) {
      options.onAuthenticationError?.(error)
      return false
    }

    if (!assertionResponse)
      return false

    const verificationResponse = await $fetch<VerifiedAuthenticationResponse>(options.authenticationEndpoint, {
      method: 'POST',
      body: {
        response: assertionResponse,
        verify: true,
      },
      query: {
        attemptId,
      },
    })

    return verificationResponse && verificationResponse.verified
  }

  return {
    register,
    authenticate,
    isSupported: browserSupportsWebAuthn,
    isAutofillSupported: browserSupportsWebAuthnAutofill,
    isPlatformAvailable: platformAuthenticatorIsAvailable,
  }
}
