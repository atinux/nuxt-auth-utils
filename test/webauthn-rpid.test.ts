import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setup, $fetch, fetch, url } from '@nuxt/test-utils'
import { isoBase64URL, isoCBOR, isoUint8Array } from '@simplewebauthn/server/helpers'

// Passkeys created on `example.com` are shared with its subdomains, so the app is served
// from a different hostname than the Relying Party ID it is configured with.
const RP_ID = 'example.com'
const USER = { userName: 'ada@example.com', displayName: 'Ada Lovelace' }

interface CreationOptions {
  rp: { id: string, name: string }
  challenge: string
}

interface RequestOptions {
  rpId: string
  challenge: string
  allowCredentials: { id: string }[]
}

function sha256(value: string | Uint8Array) {
  return new Uint8Array(createHash('sha256').update(value).digest())
}

function cosePublicKey(publicKey: KeyObject) {
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string, y: string }

  return isoCBOR.encode(new Map([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, isoBase64URL.toBuffer(jwk.x)],
    [-3, isoBase64URL.toBuffer(jwk.y)],
  ]))
}

function clientDataJSON(type: 'webauthn.create' | 'webauthn.get', challenge: string, origin: string) {
  return isoBase64URL.fromBuffer(Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false })))
}

/** `authenticatorData` as described in https://w3c.github.io/webauthn/#sctn-authenticator-data */
function authenticatorData(rpID: string, attested?: { credentialId: Uint8Array, cosePublicKey: Uint8Array }) {
  const data = [
    sha256(rpID),
    // User present, plus attested credential data when registering
    new Uint8Array([attested ? 0x41 : 0x01]),
    new Uint8Array([0, 0, 0, 0]), // signCount
  ]

  if (attested) {
    data.push(
      new Uint8Array(16), // aaguid
      new Uint8Array([attested.credentialId.length >> 8, attested.credentialId.length & 0xFF]),
      attested.credentialId,
      attested.cosePublicKey,
    )
  }

  return isoUint8Array.concat(data)
}

function registrationResponse(options: { rpID: string, challenge: string, origin: string, credentialId: Uint8Array, cosePublicKey: Uint8Array }) {
  const attestationObject = isoCBOR.encode(new Map([
    ['fmt', 'none'],
    ['attStmt', new Map()],
    ['authData', authenticatorData(options.rpID, { credentialId: options.credentialId, cosePublicKey: options.cosePublicKey })],
  ]))

  return {
    id: isoBase64URL.fromBuffer(options.credentialId),
    rawId: isoBase64URL.fromBuffer(options.credentialId),
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientDataJSON('webauthn.create', options.challenge, options.origin),
      attestationObject: isoBase64URL.fromBuffer(attestationObject),
      transports: ['internal'],
    },
  }
}

function assertionResponse(options: { rpID: string, challenge: string, origin: string, credentialId: Uint8Array, privateKey: KeyObject }) {
  const data = authenticatorData(options.rpID)
  const clientData = clientDataJSON('webauthn.get', options.challenge, options.origin)
  const signature = createSign('SHA256')
    .update(Buffer.concat([Buffer.from(data), Buffer.from(sha256(isoBase64URL.toBuffer(clientData)))]))
    .sign(options.privateKey)

  return {
    id: isoBase64URL.fromBuffer(options.credentialId),
    rawId: isoBase64URL.fromBuffer(options.credentialId),
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientData,
      authenticatorData: isoBase64URL.fromBuffer(data),
      signature: isoBase64URL.fromBuffer(new Uint8Array(signature)),
      userHandle: null,
    },
  }
}

describe('WebAuthn with a configured rpID', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    nuxtConfig: {
      auth: {
        webAuthn: {
          rpID: RP_ID,
          rpName: 'Example App',
        },
      },
      runtimeConfig: {
        appSecret: 'a-test-app-secret-with-at-least-32-characters',
        webauthn: {
          rpName: 'Example App (runtime config)',
        },
      },
    },
  })

  it('registers and authenticates a passkey bound to the configured rpID', async () => {
    const origin = new URL(url('/')).origin
    // Guard the point of the test: the request hostname is not the rpID
    expect(new URL(origin).hostname).not.toBe(RP_ID)

    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const credentialId = randomBytes(16)

    const registration = await $fetch<{ creationOptions: CreationOptions, attemptId: string }>('/api/webauthn/register', {
      method: 'POST',
      body: { user: USER, verify: false },
    })
    expect(registration.creationOptions.rp.id).toBe(RP_ID)
    // `runtimeConfig` overrides the module option at runtime
    expect(registration.creationOptions.rp.name).toBe('Example App (runtime config)')

    const verified = await $fetch<{ verified: boolean }>('/api/webauthn/register', {
      method: 'POST',
      body: {
        user: USER,
        verify: true,
        attemptId: registration.attemptId,
        response: registrationResponse({
          rpID: registration.creationOptions.rp.id,
          challenge: registration.creationOptions.challenge,
          origin,
          credentialId,
          cosePublicKey: cosePublicKey(publicKey),
        }),
      },
    })
    expect(verified.verified).toBe(true)

    const authentication = await $fetch<{ requestOptions: RequestOptions, attemptId: string }>('/api/webauthn/authenticate', {
      method: 'POST',
      body: { verify: false, userName: USER.userName },
    })
    expect(authentication.requestOptions.rpId).toBe(RP_ID)
    expect(authentication.requestOptions.allowCredentials.map(credential => credential.id)).toContain(isoBase64URL.fromBuffer(credentialId))

    const response = await fetch('/api/webauthn/authenticate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        verify: true,
        userName: USER.userName,
        attemptId: authentication.attemptId,
        response: assertionResponse({
          rpID: authentication.requestOptions.rpId,
          challenge: authentication.requestOptions.challenge,
          origin,
          credentialId,
          privateKey,
        }),
      }),
    })
    expect(await response.json()).toMatchObject({ verified: true })
    // `onSuccess` ran
    expect(response.headers.getSetCookie().some(cookie => cookie.startsWith('nuxt-auth-session='))).toBe(true)
  })

  it('rejects a credential created for another rpID', async () => {
    const origin = new URL(url('/')).origin
    const credentialId = randomBytes(16)
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })

    const registration = await $fetch<{ creationOptions: CreationOptions, attemptId: string }>('/api/webauthn/register', {
      method: 'POST',
      body: { user: USER, verify: false },
    })

    const response = await fetch('/api/webauthn/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user: USER,
        verify: true,
        attemptId: registration.attemptId,
        response: registrationResponse({
          // Everything else about this response is valid
          rpID: 'attacker.example.com',
          challenge: registration.creationOptions.challenge,
          origin,
          credentialId,
          cosePublicKey: cosePublicKey(publicKey),
        }),
      }),
    })
    expect(response.status).toBe(500)
  })
})
