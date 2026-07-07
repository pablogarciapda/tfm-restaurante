/**
 * Admin Reasignar API — Pure Handler Functions (ADM-002)
 *
 * handleReasignReserva: updates zona_id and/or mesa_id on a reserva,
 * validates zona against zonas_config enabled zones,
 * validates mesa FK exists and belongs to selected zone.
 *
 * Uses serverSupabaseServiceRole for all DB access.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { ZonaConfig } from '#shared/contracts/reservation.contract'

type SupabaseServerClient = SupabaseClient<Database>
type HandlerResult = { status: number; body: Record<string, unknown> }

export async function handleReasignReserva(
  supabase: SupabaseServerClient,
  body: Record<string, unknown>,
): Promise<HandlerResult> {
  const { reserva_id, nueva_zona_id, nueva_mesa_id, motivo } = body

  if (!reserva_id || typeof reserva_id !== 'string') {
    return { status: 400, body: { error: 'reserva_id es requerido' } }
  }

  if (!nueva_zona_id && !nueva_mesa_id) {
    return { status: 400, body: { error: 'Se requiere nueva_zona_id o nueva_mesa_id' } }
  }

  // Read config to get zonas_config
  const { data: config } = await supabase
    .from('configuracion')
    .select('zonas_config')
    .limit(1)
    .single()

  const zonas: ZonaConfig[] = (config?.zonas_config as ZonaConfig[]) || []
  const enabledZonas = zonas.filter((z) => z.enabled)

  // Validate zona if provided
  if (nueva_zona_id) {
    const zona = enabledZonas.find(
      (z) => z.id === nueva_zona_id || z.nombre === nueva_zona_id,
    )
    if (!zona) {
      return {
        status: 400,
        body: { error: 'Zona no válida o no habilitada' },
      }
    }
  }

  // Validate mesa if provided
  if (nueva_mesa_id) {
    const { data: mesa } = await supabase
      .from('mesas')
      .select('id, zona, zona_nombre')
      .eq('id', nueva_mesa_id)
      .maybeSingle()

    if (!mesa) {
      return {
        status: 400,
        body: { error: 'Mesa no encontrada' },
      }
    }

    // If zona also provided, check mesa belongs to zone
    if (nueva_zona_id) {
      const zonaMatch = enabledZonas.find(
        (z) => z.id === nueva_zona_id || z.nombre === nueva_zona_id,
      )
      if (zonaMatch) {
        const mesaZona = mesa.zona_nombre || mesa.zona
        if (mesaZona !== zonaMatch.nombre) {
          return {
            status: 400,
            body: { error: 'La mesa no pertenece a la zona seleccionada' },
          }
        }
      }
    }
  }

  // Find zona name from zonas_config
  let zonaValue: string | null = null
  if (nueva_zona_id) {
    const zona = enabledZonas.find(
      (z) => z.id === nueva_zona_id || z.nombre === nueva_zona_id,
    )
    zonaValue = zona?.nombre || (nueva_zona_id as string)
  }

  // Build update payload
  const updateData: Record<string, unknown> = {}
  if (zonaValue) updateData.zona_id = zonaValue
  if (nueva_mesa_id) updateData.mesa_id = nueva_mesa_id

  // Audit: store reasignacion motivo (add to notas or log)
  // For now, we log the motivo. In future, could add a reasignado column.
  if (motivo && typeof motivo === 'string') {
    console.log(`[reasignar] Reserva ${reserva_id}: ${motivo}`)
  }

  // Update reserva
  const { data: updated, error } = await supabase
    .from('reservas')
    .update(updateData as any)
    .eq('id', reserva_id)
    .select('*')
    .single()

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  if (!updated) {
    return { status: 404, body: { error: 'Reserva no encontrada' } }
  }

  return { status: 200, body: updated as unknown as Record<string, unknown> }
}
