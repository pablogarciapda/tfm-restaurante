import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

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
