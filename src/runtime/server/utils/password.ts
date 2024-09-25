import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import type { ScryptConfig } from '@adonisjs/hash/types'
import { useRuntimeConfig } from '#imports'

let _hash: Hash

function getHash() {
  if (!_hash) {
    const options = useRuntimeConfig().hash?.scrypt as ScryptConfig
    const scrypt = new Scrypt(options)
    _hash = new Hash(scrypt)
  }
  return _hash
}

/**
 * Hash a password using scrypt
 * @param password - The plain text password to hash
 * @returns The hashed password
 * @example
 * ```ts
 * const hashedPassword = await hashPassword('user_password')
 * ```
 * @more you can configure the scrypt options in `auth.hash.scrypt`
 */
export async function hashPassword(password: string) {
  return await getHash().make(password)
}

/**
 * Verify a password against a hashed password
 * @param hashedPassword - The hashed password to verify against
 * @param plainPassword - The plain text password to verify
 * @returns `true` if the password is valid, `false` otherwise
 * @example
 * ```ts
 * const isValid = await verifyPassword(hashedPassword, 'user_password')
 * ```
 * @more you can configure the scrypt options in `auth.hash.scrypt`
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string) {
  return await getHash().verify(hashedPassword, plainPassword)
}
