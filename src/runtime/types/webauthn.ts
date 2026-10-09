import type { AuthenticationResponseJSON, AuthenticatorTransportFuture, RegistrationResponseJSON } from '@simplewebauthn/types'
import type { Ref } from 'vue'
import type { NuxtError, RequestEvent, ValidateResult } from 'nuxt/server'
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
  aaguid?: string
  [key: string]: unknown
}

export interface WebAuthnUser {
  userName: string
  displayName?: string
  [key: string]: unknown
}

type CredentialsList = NonNullable<GenerateAuthenticationOptionsOpts['allowCredentials']>

// Using a discriminated union makes it such that you can only define both storeChallenge and getChallenge or neither
type WebAuthnEventHandlerBase<T extends Record<PropertyKey, unknown>> = {
  storeChallenge: (event: RequestEvent, challenge: string, attemptId: string) => void | Promise<void>
  getChallenge: (event: RequestEvent, attemptId: string) => string | Promise<string>
  onSuccess: (event: RequestEvent, data: T) => unknown
  onError?: (event: RequestEvent, error: NuxtError) => unknown
} | {
  storeChallenge?: undefined
  getChallenge?: undefined
  onSuccess: (event: RequestEvent, data: T) => unknown
  onError?: (event: RequestEvent, error: NuxtError) => unknown
}

export type RegistrationBody<T extends WebAuthnUser> = {
  user: T
  verify: false
} | {
  user: T
  verify: true
  attemptId: string
  response: RegistrationResponseJSON
}

export type ValidateUserFunction<T> = (userBody: WebAuthnUser, event: RequestEvent) => ValidateResult<T> | Promise<ValidateResult<T>>

export type WebAuthnRegisterEventHandlerOptions<T extends WebAuthnUser> = WebAuthnEventHandlerBase<{
  user: T
  credential: WebAuthnCredential
  registrationInfo: Exclude<VerifiedRegistrationResponse['registrationInfo'], undefined>
}> & {
  getOptions?: (event: RequestEvent, body: RegistrationBody<T>) => Partial<GenerateRegistrationOptionsOpts> | Promise<Partial<GenerateRegistrationOptionsOpts>>
  validateUser?: ValidateUserFunction<T>
  excludeCredentials?: (event: RequestEvent, userName: string) => CredentialsList | Promise<CredentialsList>
}

export type AuthenticationBody = {
  verify: false
  userName?: string
} | {
  verify: true
  attemptId: string
  userName?: string
  response: AuthenticationResponseJSON
}

export type WebAuthnAuthenticateEventHandlerOptions<T extends WebAuthnCredential> = WebAuthnEventHandlerBase<{
  credential: T
  authenticationInfo: Exclude<VerifiedAuthenticationResponse['authenticationInfo'], undefined>
}> & {
  getOptions?: (event: RequestEvent, body: AuthenticationBody) => Partial<GenerateAuthenticationOptionsOpts> | Promise<Partial<GenerateAuthenticationOptionsOpts>>
  getCredential: (event: RequestEvent, credentialID: string) => T | Promise<T>
  allowCredentials?: (event: RequestEvent, userName: string) => CredentialsList | Promise<CredentialsList>
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
  register: <T extends WebAuthnUser>(user: T) => Promise<boolean>
  /**
   * Authenticate a credential
   * @param userName - The user name to authenticate, can be an email address, a username, or any other form of unique ID chosen by the user
   * @returns true if the authentication was successful
   */
  authenticate: (userName?: string) => Promise<boolean>
}
