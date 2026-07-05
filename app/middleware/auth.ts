/**
 * Auth Middleware — Session check (AUTH-003, AR-005)
 *
 * Applied to all /cocina/** routes.
 * Unauthenticated users → redirect to /cocina login page.
 * Authenticated users → proceed.
 *
 * NOTE: useSupabaseUser() may be null on fresh SPA boot even when a session
 * exists, because the Supabase plugin initialises asynchronously. We fall
 * back to getSession() before redirecting to avoid bouncing the user.
 */
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  if (user.value) {
    return // Authenticated — proceed
  }

  // Fallback: useSupabaseUser() may not have resolved yet on SPA boot.
  // Read the session directly from cookie/storage.
  const { data: { session } } = await client.auth.getSession()
  if (!session) {
    return navigateTo('/cocina')
  }

  // Session exists — proceed
})
