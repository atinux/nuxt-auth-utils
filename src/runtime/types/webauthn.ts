import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import type { Ref } from 'vue'
import type { H3Event, H3Error, ValidateFunction } from 'h3'
import type {
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server'

export interface WebAuthnCredential {
  id: string
  publicKey: string
  counter: number
  backedUp: boolean
  transports?: AuthenticatorTransportFuture[]
  [key: string]: unknown
}

export interface WebAuthnUser {
  userName: string
  displayName?: string
  [key: string]: unknown
}

type AllowCredentials = NonNullable<GenerateAuthenticationOptionsOpts['allowCredentials']>

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
  user: WebAuthnUser
  credential: WebAuthnCredential
  registrationInfo: Exclude<VerifiedRegistrationResponse['registrationInfo'], undefined>
}> & {
  getOptions?: (event: H3Event) => GenerateRegistrationOptionsOpts | Promise<GenerateRegistrationOptionsOpts>
  validateUser?: ValidateFunction<WebAuthnUser>
}

export type WebAuthnAuthenticateEventHandlerOptions = WebAuthnEventHandlerBase<{
  credential: WebAuthnCredential
  authenticationInfo: Exclude<VerifiedAuthenticationResponse['authenticationInfo'], undefined>
}> & {
  getOptions?: (event: H3Event) => Partial<GenerateAuthenticationOptionsOpts> | Promise<Partial<GenerateAuthenticationOptionsOpts>>
  getCredential: (event: H3Event, credentialID: string) => WebAuthnCredential | Promise<WebAuthnCredential>
  allowCredentials?: (event: H3Event, userName: string) => AllowCredentials | Promise<AllowCredentials>
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
   * @param user - The user data to register
   * @param user.userName - The user name to register, can be an email address, a username, or any other form of unique ID chosen by the user
   * @param user.displayName - The display name to register, used for convenience and personalization and should not be relied upon as a secure identifier for authentication processes
   * @returns true if the registration was successful
   */
  register: <T extends WebAuthnUser>(data: T) => Promise<boolean>
  /**
   * Authenticate a credential
   * @param userName - The user name to authenticate, can be an email address, a username, or any other form of unique ID chosen by the user
   * @returns true if the authentication was successful
   */
  authenticate: (userName?: string) => Promise<boolean>
}
