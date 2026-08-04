import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const oauthDirectory = fileURLToPath(new URL('../src/runtime/server/lib/oauth', import.meta.url))
const providers = readdirSync(oauthDirectory)
  .filter(file => file.endsWith('.ts'))
  .map(file => file.slice(0, -3))

describe('OAuth state protection', () => {
  it.each(providers)('%s validates browser-bound state', (provider) => {
    const source = readFileSync(`${oauthDirectory}/${provider}.ts`, 'utf8')

    expect(source).toContain('handleState(event')
    expect(source).toContain('handleInvalidState')
    expect(source).toMatch(provider === 'apple'
      ? /if \(state !== storedState\)/
      : /if \(query\.state !== state\)/)
  })
})
