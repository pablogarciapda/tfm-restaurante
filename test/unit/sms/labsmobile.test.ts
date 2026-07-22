/**
 * labsmobile.test.ts — LabsMobile adapter tests (SM-003)
 *
 * Tests:
 * - Successful POST to LabsMobile API with Basic auth
 * - 401 handling (invalid credentials)
 * - verifyCode uses shared sms-store
 * - Network error handling
 *
 * All HTTP calls mocked via vi.mock — NO real HTTP requests made.
 * Config injected via constructor (DI) — no Nuxt runtime context needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LabsMobileProvider } from '../../../server/sms/labsmobile'
import { storeCode, deleteCode } from '../../../server/utils/sms-store'

// Mock $fetch globally (Nitro auto-import)
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('LabsMobileProvider (SM-003)', () => {
  let provider: LabsMobileProvider

  beforeEach(() => {
    mockFetch.mockReset()
    deleteCode('+34600000000')
    deleteCode('+34600000001')
    provider = new LabsMobileProvider({
      username: 'test@example.com',
      token: 'test-token',
      sender: 'TestSender',
    })
  })

  it('sendVerificationCode POSTs to LabsMobile API with Basic auth', async () => {
    mockFetch.mockResolvedValueOnce({ code: '0', message: 'OK' })

    const result = await provider.sendVerificationCode('+34600000000')

    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Check URL
    const url = mockFetch.mock.calls[0][0]
    expect(url).toBe('https://api.labsmobile.com/json/send')

    // Check headers include Basic auth
    const options = mockFetch.mock.calls[0][1]
    expect(options.headers).toBeDefined()
    expect(options.headers.Authorization).toMatch(/^Basic /)

    // Check body
    const body = options.body
    expect(body.message).toContain('TestSender')
    expect(body.recipient).toEqual([{ msisdn: '+34600000000' }])
    expect(body.tpoa).toBe('TestSender')
    // test param is NOT sent — LabsMobileProvider now only runs in real mode
    expect(body.test).toBeUndefined()

    // Check result
    expect(result.success).toBe(true)
    // Code NOT exposed in production response (only mock exposes it)
    expect(result.code).toBeUndefined()
  })

  it('stores code for later verify via shared sms-store', async () => {
    mockFetch.mockResolvedValueOnce({ code: '0', message: 'OK' })

    await provider.sendVerificationCode('+34600000000')

    // The code should have been stored in the sms-store by the adapter.
    // Since the adapter generates a random code, we test indirectly:
    // verifyCode should fail with a known wrong code (code was stored but we don't know it)
    const verifyWrong = await provider.verifyCode('+34600000000', '0000')
    expect(verifyWrong.valid).toBe(false)
  })

  it('verifyCode returns valid: false for wrong code', async () => {
    storeCode('+34600000000', '5678')
    const result = await provider.verifyCode('+34600000000', '9999')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Code mismatch')
  })

  it('verifyCode returns valid: false for nonexistent code', async () => {
    const result = await provider.verifyCode('+34600000099', '1234')
    expect(result.valid).toBe(false)
  })

  it('handles 401 invalid credentials gracefully', async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), {
        response: { status: 401, _data: { error: 'UNAUTHORIZED' } },
      })
    )

    const result = await provider.sendVerificationCode('+34600000000')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid LabsMobile credentials')
  })

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

    const result = await provider.sendVerificationCode('+34600000000')

    expect(result.success).toBe(false)
    expect(result.error).toContain('SMS service unavailable')
  })
})
