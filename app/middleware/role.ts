/**
 * Role Middleware — Profile loader (PERM-001, PERM-005, AR-005)
 *
 * Loads the user's profile from Supabase, stores role + permissions
 * in useState for consumption by the permissions middleware and sidebar.
 * Missing profile → force logout + redirect to /cocina.
 *
 * Reads the user ID from 'cocina-auth-user' useState (set by auth middleware)
 * so we don't need a second getSession() call.
 */
import { getUserIdFromCookie } from '#shared/utils/session'

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  const authUser = useState<{ id: string } | null>('cocina-auth-user', () => null)

  // Priority: shared state > reactive ref > JWT cookie (no API) > getSession()
  let userId: string
  if (authUser.value?.id) {
    userId = authUser.value.id
  } else if (user.value?.id) {
    userId = user.value.id
  } else {
    // Decode JWT from sb-access-token cookie — zero API calls.
    // Avoids triggering refresh_token that Supabase rate-limits (429).
    const cookieId = getUserIdFromCookie()
    if (cookieId) {
      userId = cookieId
    } else {
      const { data: { session } } = await client.auth.getSession()
      if (!session?.user?.id) {
        return navigateTo('/cocina')
      }
      userId = session.user.id
    }
  }

  const { data: profile, error } = await client
    .from('profiles')
    .select('role, permissions')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    // Missing profile — force logout
    await client.auth.signOut()
    return navigateTo('/cocina')
  }

  // Store role and permissions for downstream middleware and UI
  const role = useState<string>('cocina-role')
  role.value = profile.role

  const permissions = useState<Record<string, boolean>>('cocina-permissions')
  permissions.value = profile.permissions as Record<string, boolean>
})
