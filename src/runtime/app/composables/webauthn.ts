import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type { VerifiedAuthenticationResponse, VerifiedRegistrationResponse } from '@simplewebauthn/server'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'
import { ref, onMounted } from '#imports'
import type { WebAuthnComposable } from '#auth-utils'

interface RegistrationInitResponse {
  creationOptions: PublicKeyCredentialCreationOptionsJSON
  attemptId: string
}

interface AuthenticationInitResponse {
  requestOptions: PublicKeyCredentialRequestOptionsJSON
  attemptId: string
}

export function useWebAuthn(options: {
  /**
   * The endpoint to register a new credential.
   * @default '/api/webauthn/register'
   */
  registerEndpoint?: string
  /**
   * The endpoint to authenticate a user.
   * @default '/api/webauthn/authenticate'
   */
  authenticateEndpoint?: string
} = {}): WebAuthnComposable {
  const { registerEndpoint = '/api/webauthn/register', authenticateEndpoint = '/api/webauthn/authenticate' } = options
  async function register(userName: string, displayName?: string) {
    const { creationOptions, attemptId } = await $fetch<RegistrationInitResponse>(registerEndpoint, {
      method: 'POST',
      body: {
        userName,
        displayName,
        verify: false,
      },
    })

    const attestationResponse = await startRegistration(creationOptions)
    const verificationResponse = await $fetch<VerifiedRegistrationResponse>(registerEndpoint, {
      method: 'POST',
      body: {
        attemptId,
        userName,
        displayName,
        response: attestationResponse,
        verify: true,
      },
    })

    return verificationResponse && verificationResponse.verified
  }

  async function authenticate(userName?: string) {
    const { requestOptions, attemptId } = await $fetch<AuthenticationInitResponse>(authenticateEndpoint, {
      method: 'POST',
      body: {
        verify: false,
        userName,
      },
    })

    const assertionResponse = await startAuthentication(requestOptions)
    const verificationResponse = await $fetch<VerifiedAuthenticationResponse>(authenticateEndpoint, {
      method: 'POST',
      body: {
        attemptId,
        userName,
        response: assertionResponse,
        verify: true,
      },
    })

    return verificationResponse && verificationResponse.verified
  }
  const isSupported = ref(false)
  onMounted(() => {
    isSupported.value = browserSupportsWebAuthn()
  })

  return {
    register,
    authenticate,
    isSupported,
    isAutofillSupported: browserSupportsWebAuthnAutofill,
    isPlatformAvailable: platformAuthenticatorIsAvailable,
  }
}
