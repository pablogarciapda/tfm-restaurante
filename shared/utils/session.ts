/**
 * shared/utils/session.ts — Session helpers for Supabase Auth
 *
 * Decodes the user ID from the Supabase access token JWT stored in the
 * sb-access-token cookie. Zero API calls — just parses the JWT payload.
 *
 * Used by auth and role middlewares to avoid triggering refresh_token
 * requests that Supabase rate-limits (429) on rapid SPA navigation.
 */

/** Cookie name set by @nuxtjs/supabase for the JWT access token */
const SB_ACCESS_TOKEN_COOKIE = 'sb-access-token'

/**
 * Decode the user ID (sub claim) from the Supabase access token JWT cookie.
 *
 * Returns null if the cookie is missing, malformed, or the JWT can't be parsed.
 * Makes NO network requests — purely client-side cookie + base64 decode.
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
