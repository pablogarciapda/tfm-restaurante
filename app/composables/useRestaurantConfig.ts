/**
 * useRestaurantConfig — Multi-tenant restaurant info from /api/public-config
 *
 * Fetches restaurant name, address, phone, maps URL, and logo from the
 * configuracion table via the public API.
 *
 * SSR-safe hydration strategy:
 * - useState initialised with FALLBACK (same on server & client)
 * - Server: Object.assign populates state during SSR render
 * - Client: defers sync until onMounted (post-hydration) to avoid DOM mismatch.
 *   After mount, watches for future navigation changes.
 *
 * Used by AppHeader (logo) and AppFooter (address/contact).
 */
import type { RestaurantConfig } from '#shared/contracts/reservation.contract'

const FALLBACK: RestaurantConfig = {
  nombre: 'Restaurante La Zíngara',
  direccion: '',
  telefono: '',
  maps_url: '',
  logo_url: null,
  site_url: '',
}

export function useRestaurantConfig() {
  // useState: shared server+client state, no hydration mismatch
  const restaurant = useState<RestaurantConfig>('restaurant-config', () => ({ ...FALLBACK }))

  // Fetch once, populate the shared state
  const { data } = useFetch<{ restaurant: RestaurantConfig }>('/api/public-config')

  // Server: populate during SSR render
  if (import.meta.server && data.value?.restaurant) {
    Object.assign(restaurant.value, data.value.restaurant)
  }

  // Client: defer until after hydration, then watch for changes
  if (import.meta.client) {
    let hydrated = false
    onMounted(() => {
      hydrated = true
      if (data.value?.restaurant) {
        Object.assign(restaurant.value, data.value.restaurant)
      }
    })
    watch(data, (val) => {
      if (hydrated && val?.restaurant) {
        Object.assign(restaurant.value, val.restaurant)
      }
    })
  }

  const direccionLineas = computed(() => {
    const d = restaurant.value.direccion
    if (!d) return []
    return d.split(',').map((s: string) => s.trim())
  })

  return {
    restaurant,
    direccionLineas,
    logoUrl: computed(() => restaurant.value.logo_url ?? '/images/logo.png'),
    nombre: computed(() => restaurant.value.nombre),
    telefono: computed(() => restaurant.value.telefono),
    mapsUrl: computed(() => restaurant.value.maps_url),
    siteUrl: computed(() => restaurant.value.site_url),
  }
}
