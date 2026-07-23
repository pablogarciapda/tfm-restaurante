/**
 * Auth Middleware — Session check (AUTH-003, AR-005)
 *
 * Applied to all /cocina/** routes.
 * Unauthenticated users → redirect to /cocina login page.
 * Authenticated users → proceed.
 *
 * Priority (NO API calls unless absolutely necessary):
 *   1. Our own cached authUser useState
 *   2. useSupabaseUser() reactive ref (synced by Supabase plugin)
 *   3. Decode user ID from sb-access-token cookie JWT (zero API calls)
 *
 * We DO NOT call client.auth.getSession() because it triggers a
 * refresh_token API call that Supabase rate-limits (429) on rapid
 * SPA navigations. The JWT cookie is enough to prove the session.
 *
 * Stores the resolved user in 'cocina-auth-user' useState so downstream
 * middleware (role, permissions) don't need to repeat the lookup.
 */
import { getUserIdFromCookie } from '#shared/utils/session'

export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Force the cocina layout for all /cocina/** routes
  to.meta = { ...to.meta, layout: 'cocina' }

  const authUser = useState<{ id: string } | null>('cocina-auth-user', () => null)

  // 1. Own cache — set by a previous middleware run
  if (authUser.value) return

  // 2. Supabase reactive user (fast, synced by plugin, no API call)
  const user = useSupabaseUser()
  if (user.value) {
    authUser.value = { id: user.value.id }
    return
  }

  // 3. Decode JWT from sb-access-token cookie — NO API call
  //    This avoids triggering a refresh_token request that Supabase
  //    rate-limits at 429 on rapid SPA navigation.
  const userId = getUserIdFromCookie()
  if (userId) {
    authUser.value = { id: userId }
    return
  }

  // No session at all — redirect to login
  return navigateTo('/cocina')
})
