/**
 * sms-store.ts — Shared in-memory SMS code store (AD7)
 *
 * Stores { code, expiresAt } keyed by phone number.
 * Used by both the mock adapter and the LabsMobile adapter for server-side verify.
 * TTL default: 10 minutes (10 * 60 * 1000 ms).
 *
 * NOTE: In-memory only — resets on server restart. Acceptable for Phase 1 mock.
 */

interface SmsStoreEntry {
  code: string
  expiresAt: number
}

const store = new Map<string, SmsStoreEntry>()

/**
 * Store a verification code for a phone number.
 * Overwrites any existing code for the same phone.
 */
export function storeCode(
  phone: string,
  code: string,
  ttlMs: number = 10 * 60 * 1000,
): void {
  store.set(phone, {
    code,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Retrieve a stored code entry for a phone number.
 * Returns null if not found or expired (expired entries are auto-deleted).
 */
export function getCode(phone: string): SmsStoreEntry | null {
  const entry = store.get(phone)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    store.delete(phone)
    return null
  }

  return entry
}

/**
 * Delete a stored code for a phone number.
 * Returns true if deleted, false if not found.
 */
export function deleteCode(phone: string): boolean {
  return store.delete(phone)
}
