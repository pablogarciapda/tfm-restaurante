/**
 * Permissions Middleware — Resource check (PERM-005, AR-005)
 *
 * Maps each /cocina route to a resource key and checks the user's
 * permissions JSON. Admin → always pass. Editor → check jsonb[resource].
 * Denied → redirect to /cocina/dashboard.
 *
 * Dashboard is always accessible to authenticated users.
 */

// Map of route prefix → resource key
const ROUTE_RESOURCE_MAP: Record<string, string> = {
  '/cocina/carta': 'carta',
  '/cocina/menu-diario': 'menu_diario',
  '/cocina/eventos': 'eventos',
  '/cocina/reservas': 'reservas',
  '/cocina/diseno': 'reservas',
  '/cocina/configuracion': 'configuracion',
  '/cocina/usuarios': 'usuarios',
  '/cocina/clientes': 'clientes',
}

export default defineNuxtRouteMiddleware((to, _from) => {
  const role = useState<string | null>('cocina-role')
  const permissions = useState<Record<string, boolean> | null>('cocina-permissions')

  // Dashboard is always accessible
  if (to.path === '/cocina/dashboard') {
    return
  }

  // Admin sees everything
  if (role.value === 'admin') {
    return
  }

  // Find the matching resource for this route
  const resource = ROUTE_RESOURCE_MAP[to.path]

  // Unknown routes — let through (Nuxt will 404 if needed)
  if (!resource) {
    return
  }

  // Check editor permissions
  const allowed = permissions.value?.[resource]

  if (!allowed) {
    return navigateTo('/cocina/dashboard')
  }

  // Editor has permission — proceed
})
