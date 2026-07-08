/**
 * GET /api/public-config — Public config for reservation page
 *
 * Returns horarios, enabled zones, texto_proteccion_datos, modo_reserva,
 * and cliente_elige_zona. No auth required (PUBLIC endpoint).
 * Uses service role to bypass RLS on configuracion for reads.
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import type { PublicConfig, HorarioConfig, ZonaConfig } from '#shared/contracts/reservation.contract'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('configuracion')
    .select('horarios_config, zonas_config, texto_proteccion_datos, modo_reserva, cliente_elige_zona, captcha_habilitado')
    .limit(1)
    .single()

  if (error || !data) {
    return {
      horarios: null,
      zonas: [],
      texto_proteccion_datos: null,
      modo_reserva: 'automatica',
      cliente_elige_zona: 'none',
      captcha_habilitado: false,
    } satisfies PublicConfig
  }

  const horarios = (data.horarios_config as HorarioConfig) || null
  const allZonas = (data.zonas_config as ZonaConfig[]) || []
  const enabledZonas = allZonas.filter((z) => z.enabled)

  const publicConfig: PublicConfig = {
    horarios: horarios as HorarioConfig,
    zonas: enabledZonas,
    texto_proteccion_datos: (data.texto_proteccion_datos as string) || null,
    modo_reserva: (data.modo_reserva as 'automatica' | 'verificada') || 'automatica',
    cliente_elige_zona: (data.cliente_elige_zona as 'none' | 'zona' | 'zona_mesa') || 'none',
    captcha_habilitado: (data.captcha_habilitado as boolean) ?? false,
  }

  return publicConfig
})
