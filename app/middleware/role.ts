/**
 * Role Middleware — Profile loader (PERM-001, PERM-005, AR-005)
 *
 * Loads the user's profile from Supabase, stores role + permissions
 * in useState for consumption by the permissions middleware and sidebar.
 * Missing profile → force logout + redirect to /cocina.
 */
export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  // Resolve the user: prefer reactive useSupabaseUser, fall back to
  // getSession() for SPA boot timing (auth middleware may have passed
  // via getSession() before the reactive ref settled).
  let userId: string
  if (user.value) {
    userId = user.value.id
  } else {
    const { data: { session } } = await client.auth.getSession()
    if (!session?.user?.id) {
      return navigateTo('/cocina')
    }
    userId = session.user.id
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
