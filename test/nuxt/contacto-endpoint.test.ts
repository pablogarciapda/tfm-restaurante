/**
 * contacto-endpoint.test.ts — /api/contacto POST integration tests (CO-004)
 *
 * Uses @nuxt/test-utils $fetch to test the mock contacto endpoint.
 * Valid body → 200 { success: true }
 * Invalid body (missing required fields) → 400 { error: "..." }
 */

import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

await setup({
  dev: true,
  browser: false,
})

describe('POST /api/contacto (CO-004)', () => {
  it('returns 200 { success: true } on valid body', async () => {
    const result = await $fetch<{ success: boolean }>('/api/contacto', {
      method: 'POST',
      body: {
        nombre: 'María García',
        email: 'maria@example.com',
        mensaje: 'Hola, me gustaría reservar para este sábado.',
      },
    })

    expect(result.success).toBe(true)
  })

  it('returns 400 when nombre is missing', async () => {
    const response = await $fetch<{
      statusCode?: number
      message?: string
      url?: string
    }>('/api/contacto', {
      method: 'POST',
      body: { email: 'maria@example.com', mensaje: 'Hola' },
      ignoreResponseError: true,
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const response = await $fetch<{ statusCode?: number; message?: string }>(
      '/api/contacto',
      {
        method: 'POST',
        body: { nombre: 'María', mensaje: 'Hola' },
        ignoreResponseError: true,
      },
    )

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when mensaje is missing', async () => {
    const response = await $fetch<{ statusCode?: number; message?: string }>(
      '/api/contacto',
      {
        method: 'POST',
        body: { nombre: 'María', email: 'maria@example.com' },
        ignoreResponseError: true,
      },
    )

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when body is empty', async () => {
    const response = await $fetch<{ statusCode?: number; message?: string }>(
      '/api/contacto',
      {
        method: 'POST',
        body: {},
        ignoreResponseError: true,
      },
    )

    expect(response.statusCode).toBe(400)
  })
})
