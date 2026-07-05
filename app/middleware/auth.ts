/**
 * Auth Middleware — Session check (AUTH-003, AR-005)
 *
 * Applied to all /cocina/** routes.
 * Unauthenticated users → redirect to /cocina login page.
 * Authenticated users → proceed.
 *
 * NOTE: useSupabaseUser() may be null on fresh SPA boot even when a session
 * exists, because the Supabase plugin initialises asynchronously. We fall
 * back to getSession() before redirecting.
 *
 * Stores the resolved user in 'cocina-auth-user' useState so downstream
 * middleware (role, permissions) don't need to call getSession() again.
 */
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  const authUser = useState<{ id: string } | null>('cocina-auth-user', () => null)

  if (user.value) {
    authUser.value = { id: user.value.id }
    return // Authenticated — proceed
  }

  // Fallback: useSupabaseUser() may not have resolved yet on SPA boot.
  // Read the session directly from cookie/storage.
  const { data: { session } } = await client.auth.getSession()
  if (!session?.user?.id) {
    return navigateTo('/cocina')
  }

  // Store for downstream middleware — avoids a second getSession() call
  // whose result may differ (cookie/storage race on SPA boot).
  authUser.value = { id: session.user.id }
})
