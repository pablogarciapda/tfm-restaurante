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

/** sessionStorage key for the auth flag */
const AUTH_FLAG_KEY = 'cocina-authenticated'

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
 * Check if the user has an active session in this browser tab/window.
 *
 * The flag is stored in sessionStorage, which is cleared when the
 * browser tab or window is closed. This means:
 * - Reload (F5) → flag survives, user stays logged in ✓
 * - SPA navigation → flag survives, user stays logged in ✓
 * - Close tab/browser → flag is gone, user must re-login ✓
 *
 * Even if the Supabase cookie (sb-access-token) persists, the user
 * still needs the sessionStorage flag to access the admin panel.
 * This is the standard security model for admin dashboards.
 */
export function isSessionAuthenticated(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(AUTH_FLAG_KEY) === 'true'
}

/**
 * Store the auth flag in sessionStorage (call after successful login).
 */
export function markSessionAuthenticated(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(AUTH_FLAG_KEY, 'true')
}

/**
 * Clear the auth flag (call on explicit logout).
 */
export function clearSessionAuth(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(AUTH_FLAG_KEY)
}
