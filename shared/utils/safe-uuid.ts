/**
 * safe-uuid.ts — Crypto-safe UUID v4 generator with fallback.
 *
 * crypto.randomUUID() requires a secure context (HTTPS or localhost).
 * On HTTP (e.g. VPS without SSL), it's undefined. This module provides
 * a fallback using Math.random() when the native API is unavailable.
 */

export function generateUUID(): string {
  // Prefer native crypto API when available (secure context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: Math.random()-based UUID v4 (non-cryptographic, acceptable for client-side IDs)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
