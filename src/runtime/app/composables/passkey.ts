import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type { VerifiedAuthenticationResponse, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from '@simplewebauthn/types'
import { computed } from 'vue'

export function usePasskey(options: {
  registrationEndpoint: string
  authenticationEndpoint: string
  onRegistrationError?: (error: unknown) => void
  onAuthenticationError?: (error: unknown) => void
}) {
  const isAvailable = computed(() => browserSupportsWebAuthn() || browserSupportsWebAuthnAutofill())
  const isPlatformAvailable = computed(() => platformAuthenticatorIsAvailable())

  async function register(userName: string, displayName: string) {
    let attestationResponse: RegistrationResponseJSON | null = null
    const creationOptions = await $fetch<PublicKeyCredentialCreationOptionsJSON>(options.registrationEndpoint, {
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
    })

    return verificationResponse && verificationResponse.verified
  }

  async function authenticate() {
    let assertionResponse: AuthenticationResponseJSON | null = null
    const requestOptions = await $fetch<PublicKeyCredentialRequestOptionsJSON>(options.authenticationEndpoint, {
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
    })

    return verificationResponse && verificationResponse.verified
  }

  return {
    register,
    authenticate,
    isAvailable,
    isPlatformAvailable,
  }
}
