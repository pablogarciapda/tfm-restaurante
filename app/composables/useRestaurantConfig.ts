/**
 * useRestaurantConfig — Multi-tenant restaurant info from /api/public-config
 *
 * Fetches restaurant name, address, phone, maps URL, and logo from the
 * configuracion table via the public API. SSR-safe with useAsyncData.
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
  const { data } = useFetch<{ restaurant: RestaurantConfig }>('/api/public-config')

  const restaurant = computed<RestaurantConfig>(
    () => data.value?.restaurant ?? FALLBACK,
  )

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
