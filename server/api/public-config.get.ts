/**
 * GET /api/public-config — Public config for reservation page + restaurant info
 *
 * Returns horarios, enabled zones, texto_proteccion_datos, modo_reserva,
 * cliente_elige_zona, and restaurant info (multi-tenant header/footer).
 * No auth required (PUBLIC endpoint).
 * Uses service role to bypass RLS on configuracion for reads.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import type { PublicConfig, HorarioConfig, ZonaConfig, RestaurantConfig } from '#shared/contracts/reservation.contract'

const DEFAULT_RESTAURANT: RestaurantConfig = {
  nombre: 'Restaurante La Zíngara',
  direccion: '',
  telefono: '',
  maps_url: '',
  logo_url: null,
}

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('configuracion')
    .select('horarios_config, zonas_config, texto_proteccion_datos, modo_reserva, sms_verificacion, notificacion_reserva, cliente_elige_zona, captcha_habilitado, restaurant_nombre, restaurant_direccion, restaurant_telefono, restaurant_maps_url, restaurant_logo_url')
    .limit(1)
    .single()

  if (error || !data) {
    return {
      horarios: null,
      zonas: [],
      texto_proteccion_datos: null,
      modo_reserva: 'automatica',
      sms_verificacion: false,
      notificacion_reserva: 'email',
      cliente_elige_zona: 'none',
      captcha_habilitado: false,
      restaurant: DEFAULT_RESTAURANT,
    } satisfies PublicConfig
  }

  const horarios = (data.horarios_config as HorarioConfig) || null
  const allZonas = (data.zonas_config as ZonaConfig[]) || []
  const enabledZonas = allZonas.filter((z) => z.enabled)

  const restaurant: RestaurantConfig = {
    nombre: (data.restaurant_nombre as string) || DEFAULT_RESTAURANT.nombre,
    direccion: (data.restaurant_direccion as string) || DEFAULT_RESTAURANT.direccion,
    telefono: (data.restaurant_telefono as string) || DEFAULT_RESTAURANT.telefono,
    maps_url: (data.restaurant_maps_url as string) || DEFAULT_RESTAURANT.maps_url,
    logo_url: (data.restaurant_logo_url as string) || null,
  }

  const publicConfig: PublicConfig = {
    horarios: horarios as HorarioConfig,
    zonas: enabledZonas,
    texto_proteccion_datos: (data.texto_proteccion_datos as string) || null,
    modo_reserva: (data.modo_reserva as 'automatica' | 'verificada') || 'automatica',
    sms_verificacion: (data.sms_verificacion as boolean) ?? false,
    notificacion_reserva: (data.notificacion_reserva as 'email' | 'sms' | 'ambos') || 'email',
    cliente_elige_zona: (data.cliente_elige_zona as 'none' | 'zona' | 'zona_mesa') || 'none',
    captcha_habilitado: (data.captcha_habilitado as boolean) ?? false,
    restaurant,
  }

  return publicConfig
})
