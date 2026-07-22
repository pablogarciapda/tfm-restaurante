/**
 * sms-factory.test.ts — SMS provider factory tests (SM-004)
 *
 * Tests:
 * - Returns MockSmsProvider when providerName is 'mock' or undefined
 * - Returns LabsMobileProvider when providerName is 'labsmobile' with credentials
 * - Falls back to mock on unknown value
 * - Falls back to mock when credentials are missing for labsmobile
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

  it('returns MockSmsProvider when providerName is undefined (default, outside Nuxt)', () => {
    // Outside Nuxt, resolveRuntimeConfig catches and returns testMode='1' → mock
    const provider = getSmsProvider()
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('returns LabsMobileProvider when providerName is "labsmobile" with credentials', () => {
    const provider = getSmsProvider('labsmobile', {
      username: 'test@example.com',
      token: 'test-token',
      sender: 'TestSender',
    })
    expect(provider.constructor.name).toBe('LabsMobileProvider')
  })

  it('falls back to mock on unknown providerName', () => {
    const provider = getSmsProvider('invalid_provider')
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('falls back to mock when labsmobile requested but no credentials', () => {
    const provider = getSmsProvider('labsmobile')
    // No configOverride and no runtimeConfig → credentials missing → fallback to mock
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('falls back to mock when labsmobile requested with partial credentials', () => {
    const provider = getSmsProvider('labsmobile', {
      username: 'test@example.com',
      token: '', // empty token → credentials incomplete
      sender: 'TestSender',
    })
    expect(provider.constructor.name).toBe('MockSmsProvider')
  })

  it('caches the provider (singleton pattern)', () => {
    const p1 = getSmsProvider('mock')
    const p2 = getSmsProvider('labsmobile', {
      username: 'test@example.com',
      token: 'test-token',
      sender: 'TestSender',
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
