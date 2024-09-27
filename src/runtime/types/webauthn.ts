import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import type { Ref } from 'vue'
import type { H3Event, H3Error } from 'h3'
import type {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server'

export interface WebAuthnAuthenticatorDevice {
  credentialID: string
  credentialPublicKey: string
  counter: number
  backedUp: boolean
  transports?: AuthenticatorTransportFuture[]
}

// Using a discriminated union makes it such that you can only define both storeChallenge and getChallenge or neither
type WebAuthnEventHandlerBase<T extends Record<PropertyKey, unknown>> = {
  storeChallenge: (event: H3Event, challenge: string, attemptId: string) => void | Promise<void>
  getChallenge: (event: H3Event, attemptId: string) => string | Promise<string>
  onSuccess: (event: H3Event, data: T) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
} | {
  storeChallenge?: undefined
  getChallenge?: undefined
  onSuccess: (event: H3Event, data: T) => void | Promise<void>
  onError?: (event: H3Event, error: H3Error) => void | Promise<void>
}

export type WebAuthnRegisterEventHandlerOptions = WebAuthnEventHandlerBase<{
  userName: string
  displayName?: string
  authenticator: WebAuthnAuthenticatorDevice
  registrationInfo: Exclude<VerifiedRegistrationResponse['registrationInfo'], undefined>
}> & {
  getOptions?: (event: H3Event) => GenerateRegistrationOptionsOpts | Promise<GenerateRegistrationOptionsOpts>
}

export type WebAuthnAuthenticateEventHandlerOptions = WebAuthnEventHandlerBase<{
  authenticator: WebAuthnAuthenticatorDevice
  authenticationInfo: Exclude<VerifiedAuthenticationResponse['authenticationInfo'], undefined>
}> & {
  getOptions?: (event: H3Event) => Partial<GenerateAuthenticationOptionsOpts> | Promise<Partial<GenerateAuthenticationOptionsOpts>>
  getCredential: (event: H3Event, credentialID: string) => WebAuthnAuthenticatorDevice | Promise<WebAuthnAuthenticatorDevice>
}

export interface WebAuthnComposable {
  /**
   * Vue ref (boolean) that checks if the webauthn API is available
   */
  isSupported: Ref<boolean>
  /**
   * Helper function that checks if the browser supports "Conditional UI" for webauthn
   * @see https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Conditional-UI
   */
  isAutofillSupported: () => Promise<boolean>
  /**
   * Helper function that returns if platform specific authenticators are available (Touch ID, Face ID, Windows Hello, etc.)
   * You can use this information to prioritize these authenticators over others.
   */
  isPlatformAvailable: () => Promise<boolean>
  /**
   * Register a credential
   * @param data.userName The user name to register
   * @param data.displayName The display name to register
   * @returns true if the registration was successful
   */
  register: <T extends { userName: string, displayName?: string }>(data: T) => Promise<boolean>
  /**
   * Authenticate a credential
   * @returns true if the authentication was successful
   */
  authenticate: (userName?: string) => Promise<boolean>
}
