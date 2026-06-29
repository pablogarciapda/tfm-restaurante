/**
 * sms-store.test.ts — shared in-memory SMS code store (AD7)
 *
 * Tests: store/get/delete, expiry behaviour
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to test the module functions directly.
// The sms-store module is server/utils/sms-store.ts (auto-imported for server/ dir in Nitro).
// For unit testing, we import directly and manipulate Date.now via vi.useFakeTimers.
import { storeCode, getCode, deleteCode } from '../../../server/utils/sms-store'

describe('sms-store (AD7)', () => {
  beforeEach(() => {
    // Clear the internal map by deleting test entries.
    // The store is a singleton module — we clean up explicitly.
    deleteCode('+34600000000')
    deleteCode('+34600000001')
    deleteCode('+34600000099')
    vi.useRealTimers()
  })

  it('stores a code and retrieves it', () => {
    storeCode('+34600000000', '1234')

    const entry = getCode('+34600000000')
    expect(entry).not.toBeNull()
    expect(entry!.code).toBe('1234')
    expect(entry!.expiresAt).toBeGreaterThan(Date.now())
  })

  it('returns null for nonexistent phone', () => {
    const entry = getCode('+34600000099')
    expect(entry).toBeNull()
  })

  it('deletes a stored code', () => {
    storeCode('+34600000000', '5678')
    expect(getCode('+34600000000')).not.toBeNull()

    const deleted = deleteCode('+34600000000')
    expect(deleted).toBe(true)
    expect(getCode('+34600000000')).toBeNull()
  })

  it('deleteCode returns false for nonexistent phone', () => {
    const deleted = deleteCode('+34600000099')
    expect(deleted).toBe(false)
  })

  it('stores different codes for different phones', () => {
    storeCode('+34600000000', '1111')
    storeCode('+34600000001', '2222')

    expect(getCode('+34600000000')!.code).toBe('1111')
    expect(getCode('+34600000001')!.code).toBe('2222')
  })

  it('overwrites existing code for same phone', () => {
    storeCode('+34600000000', 'old')
    storeCode('+34600000000', 'new')

    expect(getCode('+34600000000')!.code).toBe('new')
  })

  it('expires after TTL', () => {
    vi.useFakeTimers()
    storeCode('+34600000000', '1234', 1000) // 1s TTL

    expect(getCode('+34600000000')).not.toBeNull()

    // Advance past expiry
    vi.advanceTimersByTime(1500)

    const expired = getCode('+34600000000')
    expect(expired).toBeNull()
    vi.useRealTimers()
  })

  it('uses 10-minute default TTL', () => {
    storeCode('+34600000000', '9999')

    const entry = getCode('+34600000000')!
    // expiresAt should be roughly now + 10 min
    const tenMinutes = 10 * 60 * 1000
    expect(entry.expiresAt).toBeGreaterThan(Date.now())
    expect(entry.expiresAt).toBeLessThanOrEqual(Date.now() + tenMinutes + 100)
  })
})
