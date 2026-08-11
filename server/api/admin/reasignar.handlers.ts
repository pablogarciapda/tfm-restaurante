/**
 * Admin Reasignar API — Pure Handler Functions (ADM-002)
 *
 * handleReasignReserva: updates zona_id and/or mesa_id on a reserva,
 * validates zona against zonas_config enabled zones,
 * validates mesa FK exists and belongs to selected zone,
 * checks for time-window conflicts before assigning a mesa.
 *
 * Uses serverSupabaseServiceRole for all DB access.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { ZonaConfig, HorarioConfig } from '#shared/contracts/reservation.contract'
import { hasMesaConflict, buildTurnoWindows } from '#shared/utils/reserva-overlap'
import { resolveZone } from '#shared/utils/zone-resolver'

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

  const zonas: ZonaConfig[] = (config?.zonas_config as unknown as ZonaConfig[]) || []
  const enabledZonas = zonas.filter((z) => z.enabled)

  // Validate zona if provided
  const resolvedRequestedZone = nueva_zona_id ? resolveZone(nueva_zona_id, enabledZonas) : null
  if (nueva_zona_id && !resolvedRequestedZone) {
      return {
        status: 400,
        body: { error: 'Zona no válida o no habilitada' },
      }
  }

  // Validate mesa if provided
  if (nueva_mesa_id) {
    const { data: mesa } = await supabase
      .from('mesas')
      .select('id, zona_id, zona, zona_nombre, capacidad_actual')
      .eq('id', nueva_mesa_id as string)
      .maybeSingle()

    if (!mesa) {
      return {
        status: 400,
        body: { error: 'Mesa no encontrada' },
      }
    }

    // If zona also provided, check mesa belongs to zone
    if (nueva_zona_id) {
      if (resolvedRequestedZone) {
        const mesaZone = resolveZone(mesa.zona_id, enabledZonas, { requireEnabled: false })
          ?? resolveZone(mesa.zona_nombre || mesa.zona, enabledZonas, { requireEnabled: false })
        if (!mesaZone || mesaZone.id !== resolvedRequestedZone.id) {
          return {
            status: 400,
            body: { error: 'La mesa no pertenece a la zona seleccionada' },
          }
        }
      }
    }

    // Validate capacity against reserva comensales
    const { data: reserva } = await supabase
      .from('reservas')
      .select('numero_comensales, fecha_hora')
      .eq('id', reserva_id)
      .maybeSingle()

    if (reserva?.numero_comensales) {
      if (mesa.capacidad_actual < reserva.numero_comensales) {
        return {
          status: 400,
          body: {
            error: `La mesa tiene capacidad para ${mesa.capacidad_actual} comensales, pero la reserva es de ${reserva.numero_comensales}`,
          },
        }
      }
    }

    // Check for time-window conflicts before reassigning
    if (reserva?.fecha_hora) {
      const { data: configHorarios } = await supabase
        .from('configuracion')
        .select('horarios_config')
        .limit(1)
        .single()

      const horarios = configHorarios?.horarios_config as HorarioConfig | null
      if (horarios) {
        const turnos = buildTurnoWindows(horarios)
        const { data: existingReservas } = await supabase
          .from('reservas')
          .select('fecha_hora, estado')
          .eq('mesa_id', nueva_mesa_id as string)
          .neq('id', reserva_id)

        if (existingReservas && hasMesaConflict(existingReservas, reserva.fecha_hora, turnos)) {
          return {
            status: 409,
            body: { error: 'La mesa ya tiene una reserva en ese horario. Seleccione otra mesa o cambie la hora.' },
          }
        }
      }
    }
  }

  // Find zona name from zonas_config
  const mesaForAssignment = nueva_mesa_id
    ? await supabase.from('mesas').select('zona_id, zona, zona_nombre').eq('id', nueva_mesa_id as string).maybeSingle()
    : { data: null }
  const mesaZone = mesaForAssignment.data
    ? resolveZone(mesaForAssignment.data.zona_id, enabledZonas, { requireEnabled: false })
      ?? resolveZone(mesaForAssignment.data.zona_nombre || mesaForAssignment.data.zona, enabledZonas, { requireEnabled: false })
    : null
  const resolvedZone = resolvedRequestedZone ?? mesaZone

  // Build update payload
  const updateData: Record<string, unknown> = {}
  if (resolvedZone) updateData.zona_id = resolvedZone.id
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
