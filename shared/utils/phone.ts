/**
 * shared/utils/phone.ts — Spanish phone normalization
 *
 * Normalizes Spanish MOBILE numbers to E.164 format (+34XXXXXXXXX).
 * Only accepts 6XX (mobile) and 7XX (mobile) prefixes.
 * Rejects 9XX (landline) since SMS can only be sent to mobile numbers.
 * Shared between client and server (auto-imported via Nuxt 4 shared/).
 *
 * Accepts: 600000000, +34600000000, 34600000000, 600 00 00 00, etc.
 * Returns normalized E.164 string or null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()]/g, '')

  // Already E.164 with +34 (mobile only: 6 or 7 prefix)
  if (/^\+34[67]\d{8}$/.test(cleaned)) return cleaned

  // With 34 prefix but no + (mobile only: 6 or 7 prefix)
  if (/^34[67]\d{8}$/.test(cleaned)) return `+${cleaned}`

  // Without prefix, starts with 6/7, 9 digits
  if (/^[67]\d{8}$/.test(cleaned)) return `+34${cleaned}`

  return null
}

export function isValidSpanishPhone(raw: string): boolean {
  return normalizePhone(raw) !== null
}
