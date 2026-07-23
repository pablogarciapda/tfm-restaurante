/**
 * shared/utils/session.ts — Session helpers for Supabase Auth
 *
 * SECURITY NOTE on JWT client-side decoding:
 * The Supabase `sb-access-token` cookie already exists — @nuxtjs/supabase
 * stores it automatically. Reading it client-side adds NO new exposure:
 * any JavaScript on the page can already access `document.cookie`.
 *
 * What we read: ONLY the `sub` claim (user ID) — a public identifier.
 * What we NEVER read: the full JWT, the signature, or the refresh_token.
 * The JWT is NOT sent to third parties, logged, or stored anywhere.
 *
 * This is equivalent to what useSupabaseUser() does internally, but
 * without triggering a refresh_token API call (which causes 429).
 */

/** Cookie name set by @nuxtjs/supabase for the JWT access token */
const SB_ACCESS_TOKEN_COOKIE = 'sb-access-token'

/** Maximum session duration before forced re-login (24 hours) */
export const SESSION_MAX_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Decode the user ID (sub claim) from the Supabase access token JWT cookie.
 *
 * Returns null if the cookie is missing, malformed, or the JWT can't be parsed.
 * Makes NO network requests — purely client-side cookie + base64 decode.
 *
 * SECURITY: Only reads the `sub` claim (public user ID). The JWT itself
 * is already in the cookie and accessible to the page via document.cookie.
 */
export function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SB_ACCESS_TOKEN_COOKIE}=([^;]+)`))
  if (!match) return null

  try {
    // JWT format: header.payload.signature
    const payload = match[1].split('.')[1]
    if (!payload) return null

    // JWT uses base64url (RFC 4648 §5) — convert to standard base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const decoded = JSON.parse(json)

    return decoded?.sub || null
  } catch {
    return null
  }
}

/**
 * Check if the session has exceeded the maximum duration.
 *
 * Stores the login timestamp in sessionStorage (survives SPA navigation)
 * and compares it against SESSION_MAX_DURATION_MS.
 *
 * Returns true if the session is still valid, false if it needs re-login.
 * If no timestamp is stored (first run), stores it and returns true.
 */
export function isSessionValid(): boolean {
  if (typeof sessionStorage === 'undefined') return true // SSR guard

  const stored = sessionStorage.getItem('cocina-login-time')
  const now = Date.now()

  if (!stored) {
    // First check — store the login time from the JWT's `exp` claim
    const token = getUserIdFromCookie()
    if (!token) return false // No session at all
    sessionStorage.setItem('cocina-login-time', String(now))
    return true
  }

  const loginTime = parseInt(stored, 10)
  if (Number.isNaN(loginTime)) return true

  return now - loginTime < SESSION_MAX_DURATION_MS
}

/**
 * Clear the stored session timestamp (call on explicit logout).
 */
export function clearSessionTimestamp(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem('cocina-login-time')
}
