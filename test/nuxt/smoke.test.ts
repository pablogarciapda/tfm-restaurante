import { describe, it, expect } from 'vitest'

describe('Nuxt Integration Smoke — SSR /', () => {
  it('returns 200 with Spanish HTML from SSR /', async () => {
    // RED: app/pages/index.vue does not exist yet — the default Nuxt
    // welcome page will NOT contain Spanish restaurant text.
    //
    // Uses native fetch against the Nuxt dev server (must be running).
    // In CI/verify phase, the dev server is started externally.
    const baseUrl = process.env.NUXT_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/`)
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toBeTruthy()
    expect(html).toContain('<!DOCTYPE html>')
    // These assertions will FAIL (RED) because the Spanish text
    // doesn't exist yet — app/pages/index.vue is not created until Phase 4.
    expect(html).toContain('Restaurante La Zíngara')
    expect(html).toContain('Santa María del Páramo')
  })
})
