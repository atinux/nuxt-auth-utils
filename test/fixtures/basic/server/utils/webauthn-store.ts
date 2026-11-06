import type { WebAuthnCredential } from '#auth-utils'

export interface StoredCredential extends WebAuthnCredential {
  userName: string
}

export const credentials = new Map<string, StoredCredential>()
export const challenges = new Map<string, string>()
