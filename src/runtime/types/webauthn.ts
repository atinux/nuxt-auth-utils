export interface PasskeyComposable {
  /**
   * Computed indicating if the webauthn is available
   */
  isSupported: () => boolean
  /**
   * Computed indicating if the webauthn autofill is available
   */
  isAutofillSupported: () => Promise<boolean>
  /**
   * Computed indicating if the webauthn is available on the current platform
   */
  isPlatformAvailable: () => Promise<boolean>
  /**
   * Register a passkey
   * @param userName The user name to register
   * @param displayName The display name to register
   * @returns true if the registration was successful
   */
  register: (userName: string, displayName?: string) => Promise<boolean>
  /**
   * Authenticate a passkey
   * @returns true if the authentication was successful
   */
  authenticate: () => Promise<boolean>
}
