/**
 * mock.test.ts — Mock SMS adapter tests (SM-002)
 *
 * Tests:
 * - send stores code with 10-min expiry
 * - verify correct code → valid: true
 * - verify wrong code → valid: false
 * - verify expired code → valid: false
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MockSmsProvider } from '../../../server/sms/mock'

describe('MockSmsProvider (SM-002)', () => {
  let provider: MockSmsProvider

  beforeEach(() => {
    provider = new MockSmsProvider()
  })

  it('sendVerificationCode returns success with code "1234"', async () => {
    const result = await provider.sendVerificationCode('+34600000000')

    expect(result.success).toBe(true)
    expect(result.code).toBe('1234')
  })

  it('verifyCode with correct code returns valid: true', async () => {
    await provider.sendVerificationCode('+34600000000')
    const result = await provider.verifyCode('+34600000000', '1234')

    expect(result.valid).toBe(true)
  })

  it('verifyCode with wrong code returns valid: false', async () => {
    await provider.sendVerificationCode('+34600000000')
    const result = await provider.verifyCode('+34600000000', '0000')

    expect(result.valid).toBe(false)
  })

  it('verifyCode with no stored code returns valid: false', async () => {
    const result = await provider.verifyCode('+34600000099', '1234')

    expect(result.valid).toBe(false)
  })

  it('verifyCode deletes code on successful verify (one-time use)', async () => {
    await provider.sendVerificationCode('+34600000000')

    // First verify should succeed
    const first = await provider.verifyCode('+34600000000', '1234')
    expect(first.valid).toBe(true)

    // Second verify with same code should fail (code deleted)
    const second = await provider.verifyCode('+34600000000', '1234')
    expect(second.valid).toBe(false)
  })

  it('verification code expires after 10 minutes', async () => {
    vi.useFakeTimers()

    await provider.sendVerificationCode('+34600000000')

    // Before expiry — should be valid
    const before = await provider.verifyCode('+34600000000', '1234')
    expect(before.valid).toBe(true)

    // Re-send (since code was consumed by one-time delete above)
    await provider.sendVerificationCode('+34600000000')

    // Advance past 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000)

    const after = await provider.verifyCode('+34600000000', '1234')
    expect(after.valid).toBe(false)

    vi.useRealTimers()
  })

  it('supports multiple phone numbers independently', async () => {
    await provider.sendVerificationCode('+34600000001')
    await provider.sendVerificationCode('+34600000000')

    const verify1 = await provider.verifyCode('+34600000001', '1234')
    expect(verify1.valid).toBe(true)

    const verify2 = await provider.verifyCode('+34600000000', '1234')
    expect(verify2.valid).toBe(true)
  })
})
