/**
 * Auth Middleware — Session check (AUTH-003, AR-005)
 *
 * Applied to all /cocina/** routes.
 * Unauthenticated users → redirect to /cocina login page.
 * Authenticated users → proceed.
 */
export default defineNuxtRouteMiddleware((_to, _from) => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/cocina')
  }

  // Authenticated — proceed to next middleware
})
