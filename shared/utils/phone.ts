/**
 * shared/utils/phone.ts — Spanish phone normalization
 *
 * Normalizes Spanish mobile numbers to E.164 format (+34XXXXXXXXX).
 * Shared between client and server (auto-imported via Nuxt 4 shared/).
 *
 * Accepts: 600000000, +34600000000, 34600000000, 600 00 00 00, etc.
 * Returns normalized E.164 string or null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '')

  // Already E.164 with +34
  if (/^\+34[679]\d{8}$/.test(cleaned)) return cleaned

  // With 34 prefix but no +
  if (/^34[679]\d{8}$/.test(cleaned)) return `+${cleaned}`

  // Without prefix, starts with 6/7/9, 9 digits
  if (/^[679]\d{8}$/.test(cleaned)) return `+34${cleaned}`

  return null
}

export function isValidSpanishPhone(raw: string): boolean {
  return normalizePhone(raw) !== null
}
