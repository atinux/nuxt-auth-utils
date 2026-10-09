import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const runtimeDir = fileURLToPath(new URL('../src/runtime', import.meta.url))
const files = readdirSync(runtimeDir, { recursive: true, encoding: 'utf8' })
  .filter(file => /\.(?:ts|vue)$/.test(file))

describe('runtime imports', () => {
  it.each(files)('%s does not import from h3 or Nitro', (file) => {
    const source = readFileSync(join(runtimeDir, file), 'utf8')
    expect(source).not.toMatch(/from ['"](?:h3|nitropack(?:\/[^'"]*)?|nitro(?:\/[^'"]*)?)['"]/)
  })

  it.each(files.filter(file => file.startsWith('server')))('%s does not use #imports', (file) => {
    const source = readFileSync(join(runtimeDir, file), 'utf8')
    expect(source).not.toMatch(/from ['"]#imports['"]/)
  })
})
