import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { readFileSync } from 'node:fs'

// Load .env for Supabase credentials
const envContent = readFileSync('.env', 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

await setup({
  dev: true,
  browser: false,
})

describe('Nuxt Integration Smoke — SSR /', () => {
  it('returns 200 with Spanish HTML from SSR /', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('Restaurante La Zíngara')
    expect(html).toContain('Santa María del Páramo')
  })
})
