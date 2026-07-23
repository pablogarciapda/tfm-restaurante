/**
 * Auth Middleware — Session check (AUTH-003, AR-005)
 *
 * Applied to all /cocina/** routes.
 * Unauthenticated users → redirect to /cocina login page.
 * Authenticated users → proceed.
 *
 * PRIMARY gate: sessionStorage flag. Cleared when browser tab/window closes,
 * so closing the browser = logout. This also avoids calling useSupabaseUser()
 * on every navigation when the flag is absent (eliminates 429 rate limits).
 *
 * SECONDARY gate: Supabase session chain (useSupabaseUser → getSession →
 * cookie fallback) from the original middleware.
 *
 * Stores the resolved user in 'cocina-auth-user' useState so downstream
 * middleware (role, permissions) don't need to call getSession() again.
 */
import { isSessionAuthenticated } from '#shared/utils/session'

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Force the cocina layout for all /cocina/** routes
  to.meta = { ...to.meta, layout: 'cocina' }

  // PRIMARY gate: sessionStorage — cleared when browser/tab closes.
  // No Supabase network call needed. If false, redirect immediately.
  if (!isSessionAuthenticated()) {
    return navigateTo('/cocina')
  }

  // SECONDARY gate: try Supabase session chain
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  const authUser = useState<{ id: string } | null>('cocina-auth-user', () => null)

  if (user.value) {
    authUser.value = { id: user.value.id }
    return // Authenticated — proceed
  }

  // Fallback: useSupabaseUser() may not have resolved yet on SPA boot.
  // Read the session directly from cookie/storage.
  try {
    const { data: { session } } = await client.auth.getSession()
    if (session?.user?.id) {
      authUser.value = { id: session.user.id }
      return
    }
  } catch {
    // getSession() can throw 429 (rate limited) on rapid page refreshes.
    // If the user already has the auth cookie from a previous session,
    // let them through — the token refresh will work on the next attempt.
    console.warn('[auth] getSession() failed — user may need to re-login')
  }

  // Last resort: check if there's a refresh_token cookie (means session exists)
  const hasSession = document?.cookie?.includes('sb-refresh-token') ?? false
  if (!hasSession) {
    return navigateTo('/cocina')
  }
})
