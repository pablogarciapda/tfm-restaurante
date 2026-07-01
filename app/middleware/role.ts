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

  // Safety: auth middleware should have already checked, but guard anyway
  if (!user.value) {
    return navigateTo('/cocina')
  }

  const { data: profile, error } = await client
    .from('profiles')
    .select('role, permissions')
    .eq('id', user.value.id)
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
