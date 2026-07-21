/**
 * sms-factory.test.ts — SMS provider factory tests (SM-004)
 *
 * Tests:
 * - Returns MockSmsProvider when providerName is 'mock' or undefined
 * - Returns LabsMobileProvider when providerName is 'labsmobile'
 * - Falls back to mock on unknown value
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getSmsProvider, resetSmsProvider } from '../../../server/utils/sms-factory'

describe('sms-factory (SM-004)', () => {
  beforeEach(() => {
    resetSmsProvider()
  })

  it('returns MockSmsProvider when providerName is "mock"', () => {
    const provider = getSmsProvider('mock')
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('returns MockSmsProvider when providerName is undefined (default)', () => {
    const provider = getSmsProvider()
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('returns LabsMobileProvider when providerName is "labsmobile"', () => {
    const provider = getSmsProvider('labsmobile', {
      username: 'test@example.com',
      token: 'test-token',
      sender: 'TestSender',
      testMode: '1',
    })
    expect(provider.constructor.name).toBe('LabsMobileProvider')
  })

  it('falls back to mock on unknown providerName', () => {
    const provider = getSmsProvider('invalid_provider')
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('caches the provider (singleton pattern)', () => {
    const p1 = getSmsProvider('mock')
    const p2 = getSmsProvider('labsmobile', {
      username: 'test@example.com',
      token: 'test-token',
      sender: 'TestSender',
      testMode: '1',
    })
    // Should return cached instance (still mock)
    expect(p1 === p2).toBe(true)
  })

  it('resetSmsProvider clears the cache', () => {
    const p1 = getSmsProvider('mock')
    resetSmsProvider()
    const p2 = getSmsProvider('mock')
    // New instance after reset
    expect(p1 === p2).toBe(false)
  })
})
