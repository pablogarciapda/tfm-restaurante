/**
 * Generic restaurant config for unit tests.
 *
 * Multi-tenant rule: tests MUST NOT use real restaurant data
 * (names, addresses, phone numbers, emails, URLs).
 * Import this fixture instead of hardcoding values.
 */
export const TEST_RESTAURANT = {
  nombre: 'Test Restaurant',
  direccion: 'Calle Test, 1, 12345 Test City, Test Region',
  telefono: '600 000 000',
  maps_url: 'https://maps.google.com/?q=40.0,-3.0',
  site_url: 'https://www.test-restaurant.com',
  email: 'reservas@test-restaurant.com',
  instagram_url: 'https://www.instagram.com/test-restaurant',
  facebook_url: 'https://www.facebook.com/TestRestaurant',
  poblacion: 'Test City, Test Region',
  logo_url: null as string | null,
  icon_url: null as string | null,
} as const

/** Minimal configData shape matching ConfigData from reservation.contract.ts */
export const TEST_CONFIG_DATA = {
  ...TEST_RESTAURANT,
  capacidad_total_local: 264,
  mostrar_recomendados: true,
  titulo_recomendados: 'Nuestras Recomendaciones',
  modo_ocupacion: 'auto' as const,
  ocupacion_manual: 0,
  max_ancho_imagen: 1200,
  calidad_imagen: 80,
  max_peso_imagen: 5,
  auto_comprimir_imagen: true,
} as const
