import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import type { Ref } from 'vue'

export interface AuthenticatorDevice {
  credentialID: string
  credentialPublicKey: string
  counter: number
  transports?: AuthenticatorTransportFuture[]
}

export interface WebauthnComposable {
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
   * @param userName The user name to register
   * @param displayName The display name to register
   * @returns true if the registration was successful
   */
  register: (userName: string, displayName?: string) => Promise<boolean>
  /**
   * Authenticate a credential
   * @returns true if the authentication was successful
   */
  authenticate: (userName?: string) => Promise<boolean>
}
