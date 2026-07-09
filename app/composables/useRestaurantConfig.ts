/**
 * useRestaurantConfig — Multi-tenant restaurant info from /api/public-config
 *
 * Fetches restaurant name, address, phone, maps URL, and logo from the
 * configuracion table via the public API.
 *
 * SSR-safe: uses useState for stable hydration (no v-if DOM mismatch).
 * useState guarantees same initial value on server & client during hydration.
 * useFetch populates the shared state; components read from the ref directly.
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
}

export function useRestaurantConfig() {
  // useState: shared server+client state, no hydration mismatch
  const restaurant = useState<RestaurantConfig>('restaurant-config', () => ({ ...FALLBACK }))

  // Fetch once, populate the shared state
  const { data } = useFetch<{ restaurant: RestaurantConfig }>('/api/public-config')

  if (import.meta.server && data.value?.restaurant) {
    Object.assign(restaurant.value, data.value.restaurant)
  }
  if (import.meta.client) {
    watch(data, (val) => {
      if (val?.restaurant) {
        Object.assign(restaurant.value, val.restaurant)
      }
    }, { immediate: true })
  }

  // Formatted address parts (parsed from direccion)
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
  }
}
